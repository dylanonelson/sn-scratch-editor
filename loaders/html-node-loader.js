module.exports = function (source) {
  return `
    const container = document.createElement('template');
    container.innerHTML = \`${source}\`;
    export default container.content.firstElementChild;
  `;
}
