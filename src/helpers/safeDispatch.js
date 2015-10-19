import { bindActionCreators } from 'redux';

export function bindSafeDispatch(dispatch) {
  return (...args) => {
    const ret = dispatch(...args);
    if (ret && typeof ret.catch === 'function') {
      return ret.catch((error) => {
        // At this point, one could call into a notification module to
        // display the errors:
        // dispatch(errorNotification(error));
        console.error('Unhandled dispatch() error:', error);
        // Return an empty promise that's never resolved. This way, .then()
        // will never trigger for the callers.
        return new Promise(() => {});
      });
    }
    return ret;
  };
}

export function bindActionCreatorsSafe(actionCreators) {
  return dispatch => {
    return bindActionCreators(actionCreators, (...args) => {
      return bindSafeDispatch(dispatch)(...args);
    });
  };
}
