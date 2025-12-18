let DISASTER_MODE = false;

module.exports = {
  enable() {
    DISASTER_MODE = true;
  },

  disable() {
    DISASTER_MODE = false;
  },

  isEnabled() {
    return DISASTER_MODE;
  }
};
