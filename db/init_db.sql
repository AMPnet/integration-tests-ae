CREATE DATABASE project_service ENCODING 'UTF-8';
CREATE USER project_service WITH PASSWORD 'password';

CREATE DATABASE wallet_service ENCODING 'UTF-8';
CREATE USER wallet_service WITH PASSWORD 'password';

CREATE DATABASE user_service ENCODING 'UTF-8';
CREATE USER user_service WITH PASSWORD 'password';

CREATE DATABASE ae_middleware_testnet ENCODING 'UTF-8';
CREATE USER ae_middleware_testnet WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE ae_middleware_testnet TO ae_middleware_testnet;

CREATE DATABASE ae_middleware_testnet_queue ENCODING 'UTF-8';
CREATE USER ae_middleware_testnet_queue WITH PASSWORD 'password';
\connect ae_middleware_testnet_queue
CREATE EXTENSION pgcrypto;
GRANT ALL PRIVILEGES ON DATABASE ae_middleware_testnet_queue TO ae_middleware_testnet_queue;
