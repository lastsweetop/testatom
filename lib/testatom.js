'use babel';

import {
  CompositeDisposable
} from 'atom';
const request = require('request');
const cheerio = require('cheerio');
const baidu = require('baidu-search');

export default {

  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'testatom:fetch': () => this.fetch()
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  fetch() {
    let editor;
    if (editor = atom.workspace.getActiveTextEditor()) {
      let selection = editor.getSelectedText();
      let language = editor.getGrammar().name;
      this.search(selection, language).then((url) => {
        return this.download(url);
      }).then((html) => {
        let answer = this.scrape(html);
        if (answer == '') {
          atom.notifications.addWarning('没有答案');
        } else {
          editor.insertText(answer);
        }
      }).catch((err) => {
        atom.notifications.addWarning(err.reason);
      });
    }
  },

  scrape(html) {
    $ = cheerio.load(html);
    return $('div.accepted-answer pre code').text()
  },

  search(keyword, language) {
    return new Promise((resolve, reject) => {
      let query = keyword+' in '+language+' site:stackoverflow.com';
      console.log(query);
      baidu(query, (error, response) => {
        if (error) {
          reject({
            reason: '百度搜索错误'
          });
        } else if (response.links.length == 0) {
          reject({
            reason: '没有搜索结果'
          });
        } else {
          console.log(response);
          resolve(response.links[0].link);
        }
      });
    });
  },

  download(url) {
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          resolve(body);
        } else {
          reject({
            reason: 'Unable to download page'
          });
        }
      });
    });
  }
}
