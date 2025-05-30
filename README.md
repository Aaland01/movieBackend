# Movies Backend

Express Backend for Moviesearch - movie library and search app

Requires selfsigned.crt and selfsigned.key generated with openSSL

Generate Certificates:

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout selfsigned.key -out selfsigned.crt


## Todo
- [ ] Modularize (middleware, repeated functions etc)
- [ ] Merge with frontend