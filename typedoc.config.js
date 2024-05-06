/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: ['./src'],
  entryPointStrategy: 'expand',
  out: 'docs',
  plugin: ['typedoc-plugin-zod'],
};
