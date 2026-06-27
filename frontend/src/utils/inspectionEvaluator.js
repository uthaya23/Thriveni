/**
 * Evaluates the actual value against the OEM parameter template
 * and returns the resulting status: 'PASS', 'FAIL', 'CRITICAL', or 'PENDING'
 */
export const evaluateParameter = (parameter, actualValue) => {
  if (actualValue === undefined || actualValue === null || actualValue === '') {
    return 'PENDING';
  }

  const { parameterType, toleranceType, standardValue, toleranceMin, toleranceMax, passingValue, severity } = parameter;

  // BOOLEAN or DROPDOWN evaluation
  if (parameterType === 'BOOLEAN' || parameterType === 'DROPDOWN') {
    if (String(actualValue).toUpperCase() === String(passingValue).toUpperCase()) {
      return 'PASS';
    } else {
      return severity === 'CRITICAL' ? 'CRITICAL' : 'FAIL';
    }
  }

  // NUMERIC evaluation
  if (parameterType === 'NUMERIC') {
    const numActual = parseFloat(actualValue);
    const numStandard = parseFloat(standardValue);
    
    if (isNaN(numActual)) return 'PENDING';

    switch (toleranceType) {
      case 'MINIMUM':
        return numActual >= numStandard ? 'PASS' : (severity === 'CRITICAL' ? 'CRITICAL' : 'FAIL');
      case 'MAXIMUM':
        return numActual <= numStandard ? 'PASS' : (severity === 'CRITICAL' ? 'CRITICAL' : 'FAIL');
      case 'RANGE':
        return (numActual >= toleranceMin && numActual <= toleranceMax) ? 'PASS' : (severity === 'CRITICAL' ? 'CRITICAL' : 'FAIL');
      case 'EXACT_MATCH':
        return numActual === numStandard ? 'PASS' : (severity === 'CRITICAL' ? 'CRITICAL' : 'FAIL');
      case 'BALANCE':
        // Balance is usually evaluated across multiple parameters, handled separately in UI
        return 'PENDING'; 
      default:
        return 'PASS'; // If no rules, assume pass if entered
    }
  }

  // PHOTO_REQUIRED or TEXT evaluation
  if (parameterType === 'PHOTO_REQUIRED' || parameterType === 'TEXT') {
    return actualValue ? 'PASS' : 'PENDING';
  }

  return 'PENDING';
};

export const calculateHealthScore = (measurements, parametersList) => {
  if (!measurements || measurements.length === 0) return 100;
  
  let totalPenalty = 0;
  let evaluatedCount = 0;

  measurements.forEach(m => {
    if (m.status === 'FAIL' || m.status === 'CRITICAL') {
      const param = parametersList.find(p => p._id === m.parameterId);
      if (param) {
        if (param.severity === 'CRITICAL') totalPenalty += 25;
        else if (param.severity === 'MAJOR') totalPenalty += 10;
        else if (param.severity === 'MINOR') totalPenalty += 3;
        else if (param.severity === 'INFO') totalPenalty += 1;
      }
    }
    if (m.status !== 'PENDING') evaluatedCount++;
  });

  if (evaluatedCount === 0) return 100;

  const score = 100 - totalPenalty;
  return score < 0 ? 0 : score;
};
