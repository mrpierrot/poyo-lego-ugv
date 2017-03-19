// See http://brunch.io for documentation.
const serverRoot = '../server';

exports.files = {
  javascripts: {
    joinTo: {
      'vendor.js': /^(?!app)/, // Files that are not in `app` dir.
      'app.js': /^app/
    }
  },
  stylesheets: {joinTo: 'app.css'}
};

exports.paths = {
  public: serverRoot+'/public',
  watched: ['app']
}

exports.plugins = {
  babel: {presets: ['latest']}
};

exports.server = {
  command: `nodemon --watch ${serverRoot} ${serverRoot}`
}
