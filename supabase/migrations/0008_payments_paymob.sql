alter table payments add column if not exists merchant_order_id text;
alter table payments add column if not exists paymob_order_id text;
alter table payments add column if not exists transaction_id text;
alter table payments add column if not exists method text;
alter table payments add column if not exists billing_name text;
alter table payments add column if not exists billing_email text;
alter table payments add column if not exists billing_phone text;
alter table payments add column if not exists processed_at timestamptz;

create unique index if not exists payments_transaction_id_idx on payments (transaction_id) where transaction_id is not null;
create unique index if not exists payments_merchant_order_idx on payments (merchant_order_id) where merchant_order_id is not null;
