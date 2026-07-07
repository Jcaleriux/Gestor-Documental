const PASSWORD_REQUIREMENTS = Object.freeze([
  {
    id: 'length',
    label: '12 caracteres o mas',
    isMet: (value) => String(value || '').length >= 12,
  },
  {
    id: 'lowercase',
    label: 'Una letra minuscula',
    isMet: (value) => /[a-z]/.test(String(value || '')),
  },
  {
    id: 'uppercase',
    label: 'Una letra mayuscula',
    isMet: (value) => /[A-Z]/.test(String(value || '')),
  },
  {
    id: 'number',
    label: 'Un numero',
    isMet: (value) => /\d/.test(String(value || '')),
  },
  {
    id: 'symbol',
    label: 'Un simbolo',
    isMet: (value) => /[^A-Za-z0-9]/.test(String(value || '')),
  },
]);

const getPasswordRequirementStates = (password) => PASSWORD_REQUIREMENTS.map((requirement) => ({
  id: requirement.id,
  label: requirement.label,
  met: requirement.isMet(password),
}));

const isStrongPassword = (password) => getPasswordRequirementStates(password)
  .every((requirement) => requirement.met);

export {
  PASSWORD_REQUIREMENTS,
  getPasswordRequirementStates,
  isStrongPassword,
};
