(function (d, w) {
'use strict';

var pointsRegEx = /^(\(([\d\.]+)\)\s*)?(.+?)(\s*\[([\d\.]+)\])?$/im; // new RegExp("^(\(([\d\.]+)\))?(.+)(\[([\d\.]+)\])?$", "i"); // Was: /^\(([\d\.]+)\)(.+)/i;

var debounce = function (func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

var pluralize = (value) => (
  value === 1 ? '' : 's'
);

var resetStoryPointsForColumn = (column) => {
  const customElements = Array.from(column.getElementsByClassName('github-project-story-points'));
  for (let e of customElements) {
    const parent = e.parentNode;
    if (parent.dataset.gpspOriginalContent) {
      parent.innerText = parent.dataset.gpspOriginalContent;
      delete parent.dataset.gpspOriginalContent;
    } else {
      parent.removeChild(e);
    }
  }
};

var workersPoints = {};
var workersSpent = {};
var workersPointsSprint = {};
var workersSpentSprint = {};

var titleWithPoints = (title, points, spent) => (
  `<span style="font-weight:bold">${title}</span><br \>
  <span class="github-project-story-points counter"
  style="font-size:xx-small">${spent} spent of ${points}</span>`
);

var titleWithTotalPoints = (title, points, spent) => (
    `${title}<span class="github-project-story-points" style="font-size:xx-small"> item${pluralize(title)} (${spent} spent of ${points})</span>`
);

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

var updateUsersPoints = function () {
  // return;
  let cards = d.getElementsByClassName('issue-card');
  for(let card of cards){
    // console.log(JSON.parse(card.getAttribute("data-card-title")));
    if(arraysEqual(JSON.parse(card.getAttribute("data-card-title")), ["points", "report"])){
      card.innerHTML = ""
      for(var user in workersPoints){

        var prog = (workersSpentSprint[user] / workersPointsSprint[user] * 100);
        var color = '';
        if(prog <= 20)        color = "#fb7b7b";
        else if(prog <= 40 )  color = "#ffa879";
        else if(prog <= 60 )  color = "#ffc163";
        else if(prog <= 80 )  color = "#feff5c";
        else if(prog <= 100)  color = "#c0ff33";
        else color = "#d4faf4";

        if(!(user in workersPointsSprint)) color = "#ffffff"

        var style = " style=\"width: 100%; border-bottom-style: solid; background-color:" + color + "\" ";
        var st = "<button " + style + ">";
        st += "User: <b>" + user + "</b><br \>";
        st += "Project: <b>" + workersPoints[user].toFixed(2) + "</b><br \>";
        if(user in workersPointsSprint){
          st += "Sprint: <b>" + workersSpentSprint[user].toFixed(2) + " / " + workersPointsSprint[user].toFixed(2) + "</b><br \>";
          st += (workersSpentSprint[user] / workersPointsSprint[user] * 100).toFixed(2) + "%" + "</button>";
        }
        else{
          st += "Sprint: <b>-</b><br \>";
          st += "- %" + "</button>";
        }
        card.innerHTML += st;
      }
      break;
    }
  }
  clearUselessStuff();
};

var addStoryPointsForColumn = (column) => {
  const columnCards = Array
    .from(column.getElementsByClassName('issue-card'))
    .filter(card => !card.classList.contains('sortable-ghost'))
    .map(card => {
      const titleElementContainer = Array
        .from(card.getElementsByClassName('h5'))
        .concat(Array.from(card.getElementsByTagName('p')))[0];
      const titleElementLink = (
        titleElementContainer.getElementsByTagName &&
        titleElementContainer.getElementsByTagName('a') ||
        []
      );
      const titleElement = (
        titleElementLink.length > 0
        ? titleElementLink[0]
        : titleElementContainer
      );
      const title = titleElementContainer.innerText;
      const story = (
        pointsRegEx.exec(titleElement.innerText) ||
        [null, '0', titleElement.innerText]
      );
      const storyPoints = parseFloat(story[2]) || 0;
      const storyTitle = story[3];
      const spentPoints = parseFloat(story[5]) || 0;
      return {
        element: card,
        titleElement,
        title,
        titleNoPoints: storyTitle,
        storyPoints,
        spentPoints,
      };
    });
  const columnCountElement = column.getElementsByClassName('js-column-card-count')[0];
  const columnName = column.getElementsByClassName('js-project-column-name')[0].innerHTML;

  let columnStoryPoints = 0;
  let columnSpentPoints = 0;

  for (let card of columnCards) {
    // console.log(card)
    columnStoryPoints += card.storyPoints;
    columnSpentPoints += card.spentPoints;
    if (card.storyPoints || card.spentPoints) {

      if (columnName != "Accepted" && card.element.dataset.cardAssignee != undefined){
        let users = JSON.parse(card.element.dataset.cardAssignee);
        for(let user of users){
          if(user in workersPoints) workersPoints[user] += card.storyPoints / users.length;
          else workersPoints[user] = card.storyPoints / users.length;
          if(user in workersSpent) workersSpent[user] += card.spentPoints / users.length;
          else workersSpent[user] = card.spentPoints / users.length;

          if(columnName == "Sprint Planning" || columnName == "In progress" || columnName == "Delivered"){
            if(user in workersPointsSprint) workersPointsSprint[user] += card.storyPoints / users.length;
            else workersPointsSprint[user] = card.storyPoints / users.length;
            if(user in workersSpentSprint) workersSpentSprint[user] += card.spentPoints / users.length;
            else workersSpentSprint[user] = card.spentPoints / users.length;
          }
        }

        updateUsersPoints();
      }

      card.titleElement.dataset.gpspOriginalContent = card.title;
      card.titleElement.innerHTML = titleWithPoints(card.titleNoPoints, card.storyPoints, card.spentPoints);
    }
  }
  // Apply DOM changes:
  if (columnStoryPoints || columnSpentPoints) {
    columnCountElement.innerHTML = titleWithTotalPoints(columnCards.length, columnStoryPoints, columnSpentPoints);
  }
};

var clearUselessStuff = function(){
  var paras = d.getElementsByClassName('text-gray');
  for(let par of paras){
    par.innerHTML = "";
  }
  // paras = d.getElementsByClassName('text-gray-light');
  // for(let par of paras){
  //   par.innerHTML = "";
  // }

  var regexp = /[0-9]{4}-[0-9]{2}-[0-9]{2}/i;
  var dates = d.getElementsByTagName('task-lists')
  for(let date of dates){
    if(regexp.exec(date.children[0].innerText) != null){
      var raw = date.children[0].innerText;
      date.setAttribute("style", "text-align: center; background-color: rgba(50, 115, 220, 0.3);")
      date.children[0].setAttribute("style", "text-align: center; background-color: rgba(50, 115, 220, 0.3);");
      date.children[0].innerHTML = '<hr><b>' + raw + '</b><hr>';
    }
  }
};

var resets = [];

var start = debounce(() => {
  // Reset
  workersPoints = {};
  workersSpent = {};
  workersPointsSprint = {};
  workersSpentSprint = {};

  for (let reset of resets) {
    reset();
  }
  resets = [];

  // Projects
  const projects = d.getElementsByClassName('project-columns-container');
  if (projects.length > 0) {
    const project = projects[0];
    const columns = Array.from(project.getElementsByClassName('js-project-column')); // Was 'col-project-custom', but that's gitenterprise; github.com is 'project-column', fortunately, both have 'js-project-column'
    for (let column of columns) {
      const addStoryPoints = ((c) => debounce(() => {
        resetStoryPointsForColumn(c);
        addStoryPointsForColumn(c);
      }, 50))(column);
      column.addEventListener('DOMSubtreeModified', addStoryPoints);
      column.addEventListener('drop', addStoryPoints);
      addStoryPointsForColumn(column);
      resets.push(((c) => () => {
        resetStoryPointsForColumn(c);
        column.removeEventListener('DOMSubtreeModified', addStoryPoints);
        column.removeEventListener('drop', addStoryPoints);
      })(column));
    }
  }
  // Issues
  const issues = Array.from(d.getElementsByClassName('js-issue-row'));
  for (let issue of issues) {
    const titleElement = issue.getElementsByClassName('h4')[0];
    const story = (
      pointsRegEx.exec(titleElement.innerText) ||
      [null, '0', titleElement.innerText]
    );
    const storyPoints = parseFloat(story[2]) || 0;
    const storyTitle = story[3];
    const spentPoints = parseFloat(story[5]) || 0;
    if (storyPoints || spentPoints) {
      titleElement.innerHTML = titleWithPoints(storyTitle, storyPoints, spentPoints);
    }
  }
}, 50);

// Hacks to restart the plugin on pushState change
w.addEventListener('statechange', () => setTimeout(() => {
  const timelines = d.getElementsByClassName('new-discussion-timeline');
  if (timelines.length > 0) {
    const timeline = timelines[0];
    const startOnce = () => {
      timeline.removeEventListener('DOMSubtreeModified', startOnce);
      start();
    };
    timeline.addEventListener('DOMSubtreeModified', startOnce);
  }
  start();
}, 500));

// First start
start();


})(document, window);
