### Poyo, Lego UGV

A Unmanned Ground Vehicule with Lego Mindstorm, BrickPI, ev3dev and NodeJS.

The developement is just started.


### Installation

## Generate HTTPS certificats

https://docs.nodejitsu.com/articles/HTTP/servers/how-to-create-a-HTTPS-server/

On Mac : 

openssl genrsa -out key.pem 2048
openssl req -new -key key.pem -out client.csr
openssl x509 -req -in client.csr -signkey key.pem -out cert.pem

Bleno : sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)