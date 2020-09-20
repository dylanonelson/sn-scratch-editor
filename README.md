# Scratch, a Standard Notes editor extension

Scratch is an editor extension for [Standard Notes](https://standardnotes.org/), a note-taking app that emphasizes privacy, security, and sustainability.

Scratch includes most of the text editing features you would expect for taking notes, like lists, checkboxes, basic text formatting, smart copy/paste, and hotkeys. It uses the library [ProseMirror](https://prosemirror.net/) to make those features possible.

## Installation

Installing Scratch works the same way it does for any Standard Notes extension. Its json configuration is hosted at `https://scratch-editor.com/ext.json`.

For more documentation, and an interactive example editor, go to <https://dylanonelson.github.io/sn-scratch-editor/>.

## Development

If you’re interested in adding features to Scratch, or if you tried it and have suggestions for features or bugfixes, open a GitHub issue and I’ll try to respond promptly.

If you just want to play around with the code to see how it works, the following commands will run the editor in ‘demo mode’ on `http://localhost:1104`.

```
npm i
npm run dev:docs
```
