import ComponentManager from 'sn-components-api';
import './styles.css';

function init() {
  const editor = document.createElement('textarea');
  editor.classList.add('ed-cls');
  document.body.appendChild(editor);

  let current = null;

  const componentManager = new ComponentManager([{
    name: 'stream-context-item',
  }], () => {
    console.log('ready!');
  });

  componentManager.streamContextItem(item => {
    console.log('note update', current);
    current = item;
    editor.value = current.content.text;
  });

  editor.addEventListener('input', e => {
    const { value } = e.target;
    console.log(value);
    if (current) {
      componentManager.saveItem(
        {
          ...current,
          content: {
            ...current.content,
            text: value,
            preview_plain: 'hey i\'m a preview',
          },
        },
        () => {
          console.log('done saving');
        }
      );
    }
  });

}

document.addEventListener('DOMContentLoaded', init);
