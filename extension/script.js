PopcornGif = {};
PopcornGif.setupDialog = function() {
  $('body').append(`
    <div id="modal1" class="modal">
      <div class="modal-content">
        <h4>Modal Header</h4>
        <p>A bunch of text</p>
      </div>
      <div class="modal-footer">
        <a href="#!" class="modal-action modal-close waves-effect waves-green btn-flat">Agree</a>
      </div>
    </div>
  `);

  $('.modal').modal();
}

PopcornGif.setup = function(r) {
  State = {
    Intro : 0,
    Loading : 1,
    Results : 2,
    Empty : 3,
    Failed : 4,
  }

  Api = {
    Tenor : 0,
    Giphy : 1, // TODO does not work currently
  }

  var api = Api.Tenor;
  var API_KEY_TENOR = 'Y7QV3LZRDJTL';
  var API_KEY_GIPHY = '3rgXBKNKDmcA5Ykg9i'; // 'd3266f0f56f94ea3b4b7eb13f0c7e8f0'; // TODO get our own API key, this is borrow from somewhere temporarily
  var currentTimeout = null;

  $('document').ready(function() {
    setup(r);
  });

  var setup = function(rootView) {
    r = rootView;
    r.find("#seach_form").on('keyup keypress', function(e) {
      var keyCode = e.keyCode || e.which;

      if (currentTimeout != null) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
      }

      if (keyCode === 13) { 
        performSearch();
        e.preventDefault();
        return false;
      } else {
        currentTimeout = setTimeout(performSearch, 400);
      }
    });

    r.find('#popcorn-bowl').click(function() {
      r.find('#search').val('popcorn');
      performSearch();
    });

    setState(State.Intro);

    r.find("#search").focus();
  }

  var performSearch = function() {
    var term = r.find('#search').val();

    if (term.length > 0) {
      search(term);
    } else {
      setState(State.Intro);
    }
  }

  var search = function(query) {
    query = query.trim();
    clearGifs();
    setState(State.Loading);

    switch (api) {
      case Api.Tenor:
        url = `https://api.tenor.co/v1/search?tag=${escapeTerm(query)}&limit=50&key=${API_KEY_TENOR}`;
        parser = parseTenorResponse;
        break;
      case Api.Giphy:
        url = `https://api.giphy.com/v1/gifs/search?q=${escapeTerm(query)}&limit=50&api_key=${API_KEY_GIPHY}`;
        parser = parseGiphyResponse;
        break;
      default:
        throw "invalid API";
    }

    $.ajax({
      url: url,
      success: function( result ) { setGifs(query, parser(result)); },
      failure: function (error) { setState(State.Failed); },
      beforeSend: function(xhr) { xhr.setRequestHeader("accept", "image/webp,image/apng,image/*,*/*;q=0.8"); },
    });
  };

  var escapeTerm = function(term) {
    return term.split(' ').map(encodeURIComponent).join('+');
  }

  var parseTenorResponse = function(response) {
    return response.results.map(function(result) {
      return createGifObj(result.media[0].tinywebm.url, result.media[0].gif.url, Api.Tenor, result.id);
    });
  }

  var parseGiphyResponse = function(response) {
    return response.data.map(function(result) {
      return createGifObj(result.images.preview_webp.url, result.embed_url, Api.Giphy, result.id);
    });
  }

  var createGifObj = function(webmurl, gifurl, api, id) {
    return {
      webmurl : webmurl,
      gifurl : gifurl,
      api : api,
      id : id
    };
  }

  var setState = function(state) {
    r.find('#intro').toggle(state == State.Intro || state == State.Failed);
    r.find('#loader').toggle(state == State.Loading);
    r.find('#gifs-container').toggle(state == State.Results);
    r.find('#gifs-empty').toggle(state == State.Empty);
  }

  var clearGifs = function() {
    r.find('.gif_column').empty();
  }

  var setGifs = function(searchTerm, gifs) {
    if (gifs.length == 0) {
      setState(State.Empty);
      return;
    }

    setState(State.Results);

    var columns = r.find('.gif_column');

    // TODO append based on height instead of round robin

    for (var i = 0; i < gifs.length; i++) {
      var container = columns[i % columns.length];
      
      var element = createGif(searchTerm, gifs[i]);
      container.append(element);
    }

    r.find('.save_btn').tooltip({delay: 50, position: 'top', tooltip: 'Save to disk'});
    r.find('.copy_btn').tooltip({delay: 50, position: 'top', tooltip: 'Copy URL'});
    r.find('.copy_github_btn').tooltip({delay: 50, position: 'top', tooltip: 'Copy Github markdown'});
  }

  var createGif = function(searchTerm, gif) {
    var tinywebm = gif.webmurl;
    var gifUrl = gif.gifurl;
    var githubMarkdown = `![${searchTerm}](${gifUrl})`;

    var div = 
      $(`
      <div class="card">
        <div class="card-image">
          <video autoplay loop muted width="100%"><source src="${tinywebm}" type="video/webm"></video>
        </div>
        <div class="card-content gif-actions">
          <img class="icon-image hand copy_github_btn" src="github.png" />
          <i class="small material-icons hand copy_btn">content_copy</i>
          <i class="small material-icons hand save_btn">save</i>
        </div>
      </div>
      `);

    div.find('.save_btn').click(function() {
      downloadFile(gifUrl, searchTerm + ".gif");
      registerShare(gif);
    });
    div.find('.copy_btn').click(function() {
      copyToClipboard(gifUrl);
      registerShare(gif);
    });
    div.find('.copy_github_btn').click(function() {
      copyToClipboard(githubMarkdown);
      registerShare(gif);
    });

    // TODO set the gif height accurately so the placeholder doesn't change size

    return div[0];
  }

  var registerShare = function(gif) {
    switch (gif.api) {
      case Api.Tenor:
        $.ajax({url: `https://api.tenor.co/v1/registershare?id=${gif.id}&key=${TENOR_API_KEY}`});
        break;
    }
  }

  var copyToClipboard = function(text) {
    var aux = document.createElement("input");
    aux.setAttribute("value", text);
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    document.body.removeChild(aux);
    Materialize.toast('Copied!', 2000);
  }

  var downloadFile = function(url, filename) {
    chrome.downloads.download({
      url: url,
      filename: filename
    });
  }
};