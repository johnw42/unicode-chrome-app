var xhr = new XMLHttpRequest();
xhr.open('GET', 'unicode.html');
xhr.onload = function() {
  document.querySelector('#unicode').innerHTML = xhr.response;
  document.querySelector('#unicode').addEventListener('click', function(event) {
    if (event.target.nodeName === 'SPAN')
      copyToClipboard(event, true);
    else if (event.target.nodeName === 'H2')
      toggle(event);
  });
  var headers = document.querySelectorAll('[data-block]');
  for (var i = 0; i < headers.length; i++) {
    headers[i].querySelector('h2').textContent += ' (' + headers[i].querySelectorAll('span').length + ')';
    headers[i].querySelector('h2').title += 'Show more...';
  }
  chrome.storage.sync.get('lastBlock', function(data) {
    var lastBlock = data.lastBlock || 'Emoticons';
    var div = document.querySelector('[data-block="' + lastBlock + '"]');
    div.scrollIntoView();
    chrome.app.window.current().show();
  });
}
xhr.send();

function toggle(event) {
  var block = event.target.parentNode;
  block.classList.toggle('hidden');
  if (!block.classList.contains('hidden')) {
    event.target.title = 'Show less...';
    chrome.storage.sync.set({lastBlock: block.dataset.block});
  } else {
    event.target.title = 'Show more...';
  }
}

function copyToClipboard(event, store) {
  chrome.storage.sync.set({lastBlock: event.target.parentNode.dataset.block});

  var buffer = document.createElement('textarea');
  document.body.appendChild(buffer);
  buffer.style.position = 'absolute'; // Hack: http://crbug.com/334062
  buffer.value = event.target.textContent;
  buffer.select();
  var result = document.execCommand('copy');
  buffer.remove();

  if (result) {
    showClipboardNotification(event.target.textContent);
    if (!store)
      return;
    chrome.storage.sync.get('favorites', function(data) {
      var favorites = data.favorites || [];
      if (favorites.length && favorites[0].unicode === event.target.textContent) {
        return;
      }
      favorites.unshift({unicode: event.target.textContent, name: event.target.title});
      favorites.length = Math.min(favorites.length, 5);
      chrome.storage.sync.set({favorites: favorites}, updateFavorites);
    });
  }
}

function updateFavorites() {
  chrome.storage.sync.get('favorites', function(data) {
    var favorites = data.favorites || [];
    var favoritesHtml = '';
    if (!favorites.length) {
      favoritesHtml = '<span></span><span></span><span></span><span></span><span></span>';
    } else {
      for (var i = 0; i < favorites.length; i++) {
        favoritesHtml += '<span title="' + favorites[i].name + '">' + favorites[i].unicode + '</span>';
      }
    }
    document.querySelector('#favorites').innerHTML = favoritesHtml;
  });
}

var notificationTimeout;

function showClipboardNotification(text) {
  clearTimeout(notificationTimeout);

  var canvas = document.createElement('canvas');
  canvas.width = canvas.height = 80 * devicePixelRatio;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#607D8B';
  ctx.fillRect(0,0,canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.font = '40pt Roboto';
  ctx.fillStyle = 'white';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 20);

  var options = {
    type: 'basic',
    message: 'You can paste it anywhere.',
    title: 'Clipboard updated',
    iconUrl: canvas.toDataURL('image/png'),
  }
  chrome.notifications.clear('id', function() {
    chrome.notifications.create('id', options, function() {
      notificationTimeout = setTimeout(function() {
        chrome.notifications.clear('id');
      }, 1e3);
    });
  });
}

var rafId;
var search = document.querySelector('#search');
var searchInput = document.querySelector('#search input');
var closeSearchButton = document.querySelector('#search #closeSearch');

function enableSearchMode() {
  search.classList.toggle('expanded', true);
  document.body.classList.toggle('search', true);
  searchInput.focus();

  var previous = document.querySelectorAll('.found');
  for (var i = 0; i < previous.length; i++) {
    previous[i].classList.toggle('found', false);
  }
  event && event.stopPropagation();
}

function disableSearchMode(event) {
  document.body.classList.toggle('search', false);
  search.classList.toggle('expanded', false);
  searchInput.value = '';
  searchInput.blur();
  event && event.stopPropagation();
}

window.addEventListener('keyup', function(event) {
  cancelAnimationFrame(rafId);
  if (event.keyCode == 191) {
    enableSearchMode();
  } else if (event.keyCode == 27) {
    disableSearchMode();
  } else {
    if (searchInput != document.activeElement || searchInput.value.length < 3) {
      return;
    }

    rafId = requestAnimationFrame(function() {
      var previous = document.querySelectorAll('.found');
      for (var i = 0; i < previous.length; i++) {
        previous[i].classList.toggle('found', false);
      }
      var founds = document.querySelectorAll('#unicode span[title*="' + searchInput.value.toUpperCase() + '"]');
      for (var i = 0; i < founds.length; i++) {
        founds[i].classList.toggle('found', true);
      }
    });
  }
});

search.addEventListener('click', function() {
  if (!search.classList.contains('expanded')) {
    enableSearchMode();
  }
});

closeSearchButton.addEventListener('click', disableSearchMode);

document.querySelector('#favorites').addEventListener('click', function(event) {
  if (event.target.nodeName === 'SPAN' && event.target.title &&
    !document.querySelectorAll('.search').length)
    copyToClipboard(event, false);
});

updateFavorites();
