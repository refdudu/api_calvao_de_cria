const formatDate = (date, withTime = false) => {
  if (!date) return null;
  const d = new Date(date);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (!withTime) return `${day}-${month}-${year}`;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const userTransformer = {
  summary: (user) => ({
    userId: user._id,
    name: user.name,
    email: user.email,
  }),

  loginOrRegister: (user, tokens) => ({
    ...userTransformer.summary(user),
    tokens,
  }),

  detailed: (user) => ({
    userId: user._id,
    name: user.name,
    email: user.email,
    cpf: user.cpf,
    birthDate: formatDate(user.birthDate),
    phone: user.phone,
    createdAt: formatDate(user.createdAt, true),
    updatedAt: formatDate(user.updatedAt, true),
  }),

  withAddresses: (user, addresses) => ({
    ...userTransformer.detailed(user),
    addresses: addresses.map((a) => ({
      id: a._id,
      street: a.street,
      city: a.city,
      state: a.state,
    })),
  }),
};

module.exports = userTransformer;
