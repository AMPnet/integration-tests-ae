CREATE DATABASE crowdfunding_ae ENCODING 'UTF-8';
CREATE USER crowdfunding_ae WITH PASSWORD 'password';

CREATE DATABASE user_service ENCODING 'UTF-8';
CREATE USER user_service WITH PASSWORD 'password';

CREATE DATABASE ae_middleware_testnet ENCODING 'UTF-8';
CREATE USER ae_middleware_testnet WITH PASSWORD 'password';

GRANT ALL PRIVILEGES ON DATABASE ae_middleware_testnet TO ae_middleware_testnet;