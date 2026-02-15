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
    (entry) => entry.role === 'user' || entry.role === 'assistant',
  );
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
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, messages: conversation }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Chat request failed');
  }

  const data = await res.json();
  conversation = data.messages || conversation;
  renderMessages(conversation);
};

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
    renderMessages(conversation);
  } catch (error) {
    console.error(error);
    conversation.push({ role: 'assistant', content: error.message });
  } finally {
    $('#chat-send').disabled = false;
    $('#chat-input').focus();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  fetchTasks();
  renderMessages(conversation);
  // setInterval(fetchTasks, 3000);
});

// Expose for tests
if (typeof window !== 'undefined') {
  window.__app = { fetchTasks, renderTasks, renderMessages };
}
