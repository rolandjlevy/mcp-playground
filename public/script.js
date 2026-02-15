const $ = (selector) => document.querySelector(selector);

let conversation = [
  {
    role: 'system',
    content: 'You are an AI agent that can call MCP tools.',
  },
];

const renderTasks = (tasks) => {
  if (!tasks || tasks.length === 0) {
    $('#tasks').innerHTML = '<div class="status">No tasks yet.</div>';
    return;
  }

  $('#tasks').innerHTML = tasks
    .map(
      (task) =>
        `<div class="task ${task.done ? 'done' : ''}">
            <div>
              <div>${task.title}</div>
              <div class="task-id">ID ${task.id}</div>
            </div>
            <div>${task.done ? 'Done' : 'Open'}</div>
          </div>`,
    )
    .join('');
};

const renderMessages = (messages) => {
  const visible = messages.filter(
    (entry) =>
      !entry.tool_calls &&
      (entry.role === 'user' || entry.role === 'assistant'),
  );
  console.log('### Rendering messages:', { messages, visible });
  $('#messages').innerHTML = visible
    .map((entry) => `<div class="bubble ${entry.role}">${entry.content}</div>`)
    .join('');
  $('#messages').scrollTop = $('#messages').scrollHeight;
};

const fetchTasks = async () => {
  try {
    const res = await fetch('/tools/list-tasks');
    if (!res.ok) {
      throw new Error('Failed to fetch tasks');
    }
    const data = await res.json();
    renderTasks(data.tasks);
    $('#task-status').textContent =
      `Updated ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    $('#task-status').textContent = 'Unable to load tasks.';
    console.error(error);
  }
};

const sendChat = async (message) => {
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, messages: conversation }),
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    let errorMessage = `Chat request failed (${res.status})`;
    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => ({}));
      if (data?.error) {
        errorMessage = `${errorMessage}: ${data.error}`;
      }
    } else {
      const text = await res.text().catch(() => '');
      if (text) {
        errorMessage = `${errorMessage}: ${text}`;
      }
    }
    throw new Error(errorMessage);
  }

  const data = await res.json();
  conversation = data.messages || conversation;
  renderMessages(conversation);
};

$('#chat-input').addEventListener('keyup', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && e.ctrlKey) {
    $('#chat-form').dispatchEvent(new Event('submit'));
  }
});

$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#chat-input').value.trim();
  if (!message) {
    return;
  }
  $('#chat-input').value = '';
  conversation.push({ role: 'user', content: message });
  $('#chat-send').disabled = true;
  try {
    await sendChat(message);
    await fetchTasks();
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    conversation.push({ role: 'assistant', content: errorMessage });
    renderMessages(conversation);
  } finally {
    $('#chat-send').disabled = false;
    $('#chat-input').focus();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await fetchTasks();
  renderMessages(conversation);
});

// Expose for tests
if (typeof window !== 'undefined') {
  window.__app = { fetchTasks, renderTasks, renderMessages };
}
