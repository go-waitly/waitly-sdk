# Waitly SDK

TS SDK for waitly

## Installation

```bash
npm install @go-waitly/waitly-sdk
```

## How to use

```javascript
import { createWaitlistClient } from '@go-waitly/waitly-sdk';

const client = createWaitlistClient({
  waitlistId: 'YOUR_WAITLIST_ID',
  apiKey: 'YOUR_API_KEY',
});

// Créer une entrée
const response = await client.createWaitlistEntry({
  email: 'user@example.com',
  name: 'John Doe',
});

console.log(`#${response}`);
```

## License

MIT
