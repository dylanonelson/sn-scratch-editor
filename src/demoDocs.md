# Scratch, a Standard Notes editor extension

Scratch is an editor extension for [Standard Notes](https://standardnotes.org/), a note-taking app that emphasizes privacy, security, and sustainability. If you don’t know what Standard Notes is, you are probably in the wrong place.

Scratch includes most of the text editing features you would expect for taking notes, like lists, checkboxes, basic text formatting, smart copy/paste, and hotkeys. It uses the library [ProseMirror](https://prosemirror.net/) to make those features possible. This page is an instance of the editor. Give it a try!

## Installation

To use the Scratch editor in Standard Notes, click Extensions in the lower left hand corner of the desktop app. Click “Import Extension” and paste in the following url: <https://scratch-editor.com/ext.json>. You will then have access to the editor on all the Standard Notes apps and will receive updates to the extension automatically.

## Formatting your notes

Scratch includes a number of ways to format your notes. It has **bold**, *italic*, and `monospace` text, and it lets you add [links](.). It includes two levels of heads, two types of lists, and todo items that have a checkbox. Scratch tries to be smart about spacing so that you don’t have to insert empty lines.

## How to use this editor

[ ] Sign up for [Standard Notes Extended](https://standardnotes.org/extensions)

[ ] [Download the desktop client](https://standardnotes.org/) and activate your subscription

[ ] Install the Scratch extension by clicking “Import Extension” and pasting the download link: `https://scratch-editor.com/ext.json`

## Hotkeys

You can also see a legend for many of these hotkeys in the alt text of the toolbar buttons.

* `ctrl + =` cycles through the levels of headings (there are two)

* `ctrl + j` turns the current text chunk into a plain paragraph

* `ctrl + u` wraps the current text chunk in a bulleted list

* `ctrl + o` wraps the current text chunk in a numbered list

* `ctrl + t` creates a checklist item from the current text chunk

* `cmd + b` toggles bold formatting on and off

* `cmd + i` toggles italic formatting on and off

* `cmd + '` toggles monospace formatting on and off

* `cmd + space` checks or unchecks a checkbox if your cursor is inside its attached text

* `cmd + k` opens a link editing dialog

* `cmd + z` is undo

* `cmd + y` is redo

## Formatting macros

* smart curly quote and apostrophe substitution

* insert headings by typing `# `

* insert bulleted lists by typing `- `

* insert numbered lists by typing `1. `

* insert bold text by wrapping it in `*`

* insert italic text by wrapping it in `_`

* insert a code block by typing three backticks ` ``` `

## Markdown integration

Scratch saves your note as markdown text. That means that if you write your notes in Scratch, you can also edit them in the other markdown editors that come with Standard Notes. It also means that if you want to stop using Scratch, you can simply uninstall it and forget that it ever existed. You can see what this text looks like in markdown by viewing [the source](https://github.com/dylanonelson/sn-scratch-editor/blob/master/src/demoDocs.md).

If you edit a note in a different editor, and then open it in Scratch, Scratch will pick up your changes (assuming those changes were made to the underlying markdown text of the note, and not using some other custom format). However, there are certain kinds of formatting that markdown supports that Scratch does not, at least not yet. If you add some text of this kind, like for example a block quote, Scratch will render it as a special type of “escaped” code block. These blocks are saved back to the underlying markdown note as pure markdown, not as a code block. If you wind up with one of these special code blocks in your note, you will see a alert to that effect in the upper right-hand corner of the code block.

Scratch markdown is [CommonMark](https://commonmark.org/) markdown, with one exception. Scratch adds checklist items in the following form:

```
[ ] An unchecked item
[x] A checked item
[X] Another checked item
```

If you create, edit, and view your checklists in Scratch, you don’t have to worry about how they look in markdown. But if you’d like to edit your notes in markdown editors, too, then know that this is what Scratch thinks of as a markdown checklist.

## Coming soon

Scratch is a work in progress. I have a running list of things I’d like to add, provided I can find the time and motivation. You can think of the following as a list of things that Scratch *doesn’t* have, at least not yet.

1. tables, or something like them

1. syntax highlighting and one-click copy-to-clipboard for code blocks

1. nested lists, with full support for markdown formatting within list items
