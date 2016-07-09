# Awilix Koa example

In this example we learn how scopes can simplify passing request state to our framework-independent services.

* `/repositories` contains a repository that is written using the factory pattern. Note how it depends on a connection string and that it is only ever constructed **once!**.
* `/services` contains a service that is resolved for each request. Note how it depends on a `currentUser` that is set for each request.
* `index.js` creates the Koa app and the container.

To start:

```
npm install
npm start
```

Go to `http://localhost:4321/messages?userId=1` to see it in action - pay attention to your terminal!
