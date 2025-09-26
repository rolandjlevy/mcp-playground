import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chatLoop() {
  while (true) {
    const userInput = await new Promise((resolve) =>
      rl.question('You: ', resolve),
    );

    if (userInput.toLowerCase() === 'exit') {
      console.log('👋 Goodbye!');
      process.exit(0);
    }

    // Send userInput to the LLM
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an AI agent that can call MCP tools.',
        },
        { role: 'user', content: userInput },
      ],
    });

    console.log('🤖 Agent:', response.choices[0].message.content);
  }
}

chatLoop();
