# Movies Backend

Express Backend for Moviesearch - movie library and search app

Requires database of movies not included in repo, mimicking API of https://www.omdbapi.com/

Documented with swaggerdoc hosted at index route

Deployment uses https
Requires selfsigned.crt and selfsigned.key generated with openSSL

Generate Certificates:

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout selfsigned.key -out selfsigned.crt


## Todo
- [x] Modularize (middleware, repeated functions etc)
- [ ] Merge with frontend