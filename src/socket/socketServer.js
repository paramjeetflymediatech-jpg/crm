let ioInstance = null;

function setIo(io) {
  ioInstance = io;
  console.log('Socket.IO global instance registered.');
}

function getIo() {
  return ioInstance;
}

/**
 * Emits a real-time event to all users connected to a specific tenant (company)
 * @param {number|string} companyId - The tenant's ID
 * @param {string} eventName - Name of the event (e.g. 'new_lead')
 * @param {object} data - The payload
 */
function emitToCompany(companyId, eventName, data) {
  if (ioInstance) {
    const roomName = `company_${companyId}`;
    ioInstance.to(roomName).emit(eventName, data);
    console.log(`Socket.IO event "${eventName}" broadcasted to room: ${roomName}`);
  } else {
    console.warn(`Socket.IO event "${eventName}" could not be sent. Socket server not initialized yet.`);
  }
}

module.exports = {
  setIo,
  getIo,
  emitToCompany
};
