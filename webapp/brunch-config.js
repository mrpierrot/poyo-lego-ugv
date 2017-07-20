// See http://brunch.io for documentation.

const serverRoot = __dirname+'/../server';

const options = {
    key:  serverRoot+'/certs/key.pem',
    cert: serverRoot+'/certs/cert.pem'
};


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
      before:["app/styles/init.css"]
    }
  }
};

exports.paths = {
  public: serverRoot+'/public',
  watched: ['app']
}

exports.plugins = {
   autoReload: {
     /* enabled: {
        css: on,
        js: on,
        assets: off
      },
      port: [1234, 2345, 3456],*/
      keyPath: options.key,
      certPath: options.cert,
      forcewss: true
  },
  babel: {
    presets: ['latest'], 
    plugins: [ 
      "syntax-jsx", 
      "transform-object-rest-spread",
      ["transform-react-jsx", {"pragma": "html"}]
    ]
  },
  postcss: {
    processors: [
      require("postcss-import")({
        path : [__dirname]
      }),
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

exports.overrides = {
  production: {
    plugins: {
      off: ['uglify-js-brunch']
    }
  }
}

exports.server = {
  //command: `nodemon --config ${serverRoot}/nodemon.json --watch ${serverRoot} ${serverRoot} `
  command: `npm --prefix ${serverRoot} run serve:dev`
}
