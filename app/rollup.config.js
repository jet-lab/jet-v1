import { config } from 'dotenv';
import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';
import json from "@rollup/plugin-json";
import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import typescript from '@rollup/plugin-typescript';
import { sveltePreprocess } from 'svelte-preprocess/dist/autoProcess';
import replace from '@rollup/plugin-replace';

config();
const development = process.env.DEVELOPMENT === 'true';

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true
      });

      process.on('SIGTERM', toExit);
      process.on('exit', toExit);
    }
  };
}

export default {
  input: 'src/main.ts',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'public/build/bundle.js'
  },
  plugins: [
    svelte({
      preprocess: sveltePreprocess({ sourceMap: development }),
      compilerOptions: {
        // enable run-time checks when not in production
        dev: development
      }
    }),
    replace({
      preventAssignment: true,

      // The following variables will be available in
      // the svelte app.
      jetDev: development,
      jetIdl: JSON.stringify(process.env.IDL),
    }),
    // we'll extract any component CSS out into
    // a separate file - better for performance
    css({ output: 'bundle.css' }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    resolve({
      browser: true,
      dedupe: ['svelte']
    }),
    commonjs(),

    typescript({
      sourceMap: development,
      inlineSources: development
    }),

    // In dev mode, call `npm run start` once
    // the bundle has been generated
    development && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    development && livereload('public'),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    !development && terser(),
    json({
      compact: true
    }),
    globals(),
    builtins()
  ],
  // suppress eval warning
  onwarn(warning, warn) {
    if (warning.code === 'EVAL') return
    warn(warning)
  },
  watch: {
    clearScreen: false
  }
};
