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
  }

  var TENOR_API_KEY = 'Y7QV3LZRDJTL';
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

    $.ajax({
      url: `https://api.tenor.co/v1/search?tag=${query}&limit=50&key=${TENOR_API_KEY}`,
        success: function( result ) {
          setState(State.Results);
          setGifs(query, result.results);
        },
        failure: function (error) {
          // TODO show error, maybe new state completely
          setState(State.Results);
        },
    });
  };

  var setState = function(state) {
    r.find('#intro').toggle(state == State.Intro);
    r.find('#loader').toggle(state == State.Loading);
    r.find('#gifs-container').toggle(state == State.Results);
  }

  var clearGifs = function() {
    r.find('.gif_column').empty();
  }

  var setGifs = function(searchTerm, results) {
    var columns = r.find('.gif_column');

    // TODO append based on height instead of round robin

    for (var i = 0; i < results.length; i++) {
      var container = columns[i % columns.length];
      
      var element = createGif(searchTerm, results[i]);
      container.append(element);
    }

    r.find('.save_btn').tooltip({delay: 50, position: 'top', tooltip: 'Save to disk'});
    r.find('.copy_btn').tooltip({delay: 50, position: 'top', tooltip: 'Copy URL'});
    r.find('.copy_github_btn').tooltip({delay: 50, position: 'top', tooltip: 'Copy Github markdown'});
  }

  var createGif = function(searchTerm, result) {
    var media = result.media[0];
    var tinywebm = media.tinywebm;
    var gifUrl = media.gif.url;
    var githubMarkdown = `![${searchTerm}](${gifUrl})`;

    var div = 
      $(`
      <div class="card">
        <div class="card-image">
          <video autoplay loop muted width="100%"><source src="${tinywebm.url}" type="video/webm"></video>
        </div>
        <div class="card-content gif-actions">
          <img class="icon-image hand copy_github_btn" src="github.png" />
          <i class="small material-icons hand copy_btn">content_copy</i>
          <i class="small material-icons hand save_btn">save</i>
        </div>
      </div>
      `);

    div.find('.save_btn').click(function() {
      downloadUri('data:image/gif,' + gifUrl, searchTerm);
      registerShare(result.id);
    });
    div.find('.copy_btn').click(function() {
      copyToClipboard(gifUrl);
      registerShare(result.id);
    });
    div.find('.copy_github_btn').click(function() {
      copyToClipboard(githubMarkdown);
      registerShare(result.id);
    });

    // TODO set the gif height accurately so the placeholder doesn't change size

    return div[0];
  }

  var registerShare = function(id) {
    $.ajax({url: `https://api.tenor.co/v1/registershare?id=${id}&key=${TENOR_API_KEY}`}); 
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

  var downloadUri = function(uri, name) {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    delete link;
  }
};