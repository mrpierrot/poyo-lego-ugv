// See http://brunch.io for documentation.
const serverRoot = '../server';

exports.files = {
  javascripts: {
    joinTo: {
      'vendor.js': /^(?!app)/, // Files that are not in `app` dir.
      'app.js': /^app/
    }
  },
  stylesheets: {
    joinTo: {
      'app.css': /^app/
    },
    order:{
      before:["app/styles.scss"]
    }
  }
};

exports.paths = {
  public: serverRoot+'/public',
  watched: ['app']
}

exports.plugins = {
  babel: {presets: ['latest']},
  sass: {
    mode: 'native',
    options: {includePaths: [
      'node_modules/normalize-scss/sass'
    ]}
  },
  postcss: {
    modules: {
        generateScopedName: '[name]__[local]___[hash:base64:5]'
    }
  }
};

exports.server = {
  command: `nodemon --config ${serverRoot}/nodemon.json --watch ${serverRoot} ${serverRoot} `
}
