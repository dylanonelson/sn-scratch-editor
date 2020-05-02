import * as svgs from './assets';

document.querySelector('button[data-format=paragraph] i').innerHTML = svgs.Notes;
document.querySelector('button[data-format=checklist_item] i').innerHTML = svgs.CheckBox;
document.querySelector('button[data-format=heading] i').innerHTML = svgs.FormatSize;
document.querySelector('button[data-format=unordered_list] i').innerHTML = svgs.FormatListBulleted;
document.querySelector('button[data-format=strong] i').innerHTML = svgs.FormatBold;
document.querySelector('button[data-format=em] i').innerHTML = svgs.FormatItalic;
document.querySelector('button[data-format=code] i').innerHTML = svgs.Code;
document.querySelector('button[data-format=link] i').innerHTML = svgs.Link;
document.querySelector('button[data-format=ordered_list] i').innerHTML = svgs.FormatListNumbered;
document.querySelector('div#link-modal label a i').innerHTML = svgs.OpenInNew;
