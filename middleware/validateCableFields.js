// Mapa de campo → tipo esperado, basado en el schema de tblcableschedule
const FIELD_TYPES = {
  FromEqNo: 'string',
  FromEqDescription: 'string',
  FromLocation: 'string',
  ToEqNo: 'string',
  ToEqDescription: 'string',
  ToLocation: 'string',
  CableSpec: 'string',
  CableType: 'string',
  Voltage: 'string',
  NoOfCores: 'int',
  SizeOfCable: 'string',
  SizeOfGlandFrom: 'string',
  SizeOfGlandTo: 'string',
  DesignLength: 'int',
  DrumNo: 'string',
  RevNo: 'string',
  GroupNo: 'string',
  CableRoute: 'string',
  NeedInsulTest: 'boolean',
  NeedHipotTest: 'boolean',
  Remarks: 'string',
  PulledLength: 'int',
  PulledDate: 'date',
  WORRef: 'string',
  WGPulled: 'string',
  PulledPending: 'string',
  PulledPendingRegistered: 'date',
  PulledPendingResp: 'string',
  PulledPendingCleared: 'string',
  PulledPendingClosed: 'date',
  TestedDate: 'date',
  WGTested: 'string',
  ConnectedDate_From: 'date',
  WGConnected_From: 'string',
  ConnectedPending_From: 'string',
  ConnectedPendingRegistered_From: 'date',
  ConnectedPendingResp_From: 'string',
  ConnectedPendingClosed_From: 'date',
  ConnectedPendingCleared_From: 'string',
  ConnectedDate_To: 'date',
  WGConnected_To: 'string',
  ConnectedPending_To: 'string',
  ConnectedPendingRegistered_To: 'date',
  ConnectedPendingResp_To: 'string',
  ConnectedPendingCleared_To: 'string',
  ConnectedPendingClosed_To: 'date',
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function checkType(value, type) {
  if (value === null) return true; // null siempre permitido (limpiar campo)

  switch (type) {
    case 'int':
      return typeof value === 'number' && Number.isInteger(value);
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean' || value === 0 || value === 1 || value === -1;
    case 'date':
      return typeof value === 'string' && DATE_REGEX.test(value) && !isNaN(Date.parse(value));
    default:
      return true;
  }
}

function validateCableFields(req, res, next) {
  const body = req.body;
  const errors = [];

  for (const [field, value] of Object.entries(body)) {
    if (!(field in FIELD_TYPES)) {
      errors.push(`Campo "${field}" no es editable o no existe`);
      continue;
    }

    const expectedType = FIELD_TYPES[field];
    if (!checkType(value, expectedType)) {
      errors.push(`Campo "${field}" debe ser de tipo ${expectedType}, recibido: ${JSON.stringify(value)}`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
}

module.exports = { validateCableFields, FIELD_TYPES };
