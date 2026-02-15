/**
 * @jest-environment jsdom
 */

describe('fetchTasks', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="tasks"></div>
      <div id="task-status"></div>
      <div id="messages"></div>
      <form id="chat-form"></form>
      <input id="chat-input" />
      <button id="chat-send"></button>
    `;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tasks: [{ id: 1, title: 'Test task', done: false }],
      }),
    });

    jest.isolateModules(() => {
      require('../public/script.js');
    });
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('renders tasks from /tools/list-tasks', async () => {
    await window.__app.fetchTasks();

    expect(global.fetch).toHaveBeenCalledWith('/tools/list-tasks');
    expect(document.querySelector('#tasks').textContent).toContain('Test task');
    expect(document.querySelector('#task-status').textContent).toContain(
      'Updated',
    );
  });
});
