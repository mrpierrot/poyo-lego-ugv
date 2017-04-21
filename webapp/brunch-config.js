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
      before:["app/styles.css"]
    }
  }
};

exports.paths = {
  public: serverRoot+'/public',
  watched: ['app']
}

exports.plugins = {
  babel: {
    presets: ['latest'], 
    plugins: [ "syntax-jsx", ["transform-react-jsx", {"pragma": "html"}]
  ]},
  postcss: {
    processors: [
      require("postcss-import")(/*{
        plugins: [
          require("stylelint")({configBasedir:'.' })
        ]
      }*/),
      // require("postcss-url")(),
      require("postcss-cssnext")(),
      require("postcss-browser-reporter")(),
      require("postcss-reporter")()
    ],
    options: {
      use: [
        require('postcss-nesting')({ /* options */ })
      ]
    }
  }
};

exports.server = {
  command: `nodemon --config ${serverRoot}/nodemon.json --watch ${serverRoot} ${serverRoot} `
}
