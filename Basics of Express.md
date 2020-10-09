# ExpressJS

## Description
A simple and intuitive framework for server side HTTPS servers built in JS.

## The Express Server
This is your main component. I will drive your application.

### Your Requests: ALL, GET, POST, PUT and DELETE

Example of GET **REPLACE `.get()` WITH THE REQUEST YOU WANT TO SPECIFY**:
```js
server.get("/json", (req, res) => {
    res.json({foo: bar});
});
```

### Middlewares
Code that executes before reaching it's destination **AS LONG AS THE CODE IS BEFORE IT'S DESTINATION**.

Think of Express as a server running off a FIFO queue of functions.

## Routers
Semi-isolated instances of Express for more control.