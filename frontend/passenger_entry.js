const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Ensure NODE_ENV is set to production by default
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Phusion Passenger passes the socket or port via process.env.PORT
const port = process.env.PORT || 3000;

app.prepare()
  .then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, (err) => {
      if (err) {
        console.error('Error listening on port/socket:', err);
        throw err;
      }
      console.log(`> Next.js custom server listening on: ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to prepare Next.js application:', err);
    process.exit(1);
  });
