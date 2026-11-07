-- Databases seeded after 0032 kept the bundled reviews unflagged; they are examples, not customer reviews.
update reviews set is_sample = true
where is_sample = false
  and verified = false
  and author in (
    'Ryan Mitchell', 'Hana Suzuki', 'Oscar Nilsson', 'Laura Romero', 'James Whitfield',
    'Nina Petrova', 'Adam Nowak', 'Mia Johansson', 'Louis B.', 'Salma K.', 'Omar H.',
    'Nour A.', 'Karim M.', 'Yasmin R.', 'Rahul Mehta', 'Neha Agarwal', 'Karthik Reddy',
    'Pooja Singh', 'Taneka C.', 'Deepa', 'Bhuvanesh P.', 'Gerald T.', 'Mandar K.',
    'Pratyay B.', 'Aarti S.', 'Preeti'
  );
