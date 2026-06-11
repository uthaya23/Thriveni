export const inspectionTemplates = {
  "830 Ac wheel motor": {
    "componentType": "KOMATSU 830E AC WHEEL MOTOR",
    "incomingParts": [
      { "partName": "Sensor, Speed", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "INSULATOR W/ STUD", "quantity": 6, "status": "Available", "remarks": "" },
      { "partName": "CABLE SPEED SENSOR", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "DRIVE RING", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "CLAMP", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "CONNECTION STRIP", "quantity": 3, "status": "Available", "remarks": "" },
      { "partName": "MAIN CABLE", "quantity": 3, "status": "Available", "remarks": "" }
    ],
    "electricalTests": {
      "irTest": {
        "appliedVoltage": 1000,
        "terminals": ["R to G", "Y to G", "B to G"],
        "standardValue": "Above 1MΩ"
      },
      "windingResistance": {
        "terminals": ["R to Y", "Y to B", "B to R"],
        "standardValue": "0.06mΩ"
      }
    }
  },
  "830 DC alternator": {
    "componentType": "830E DC MAIN ALTERNATOR",
    "incomingParts": [
      { "partName": "FAN HOUSING, 2ND STAGE", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "IMPELLER 2nd STAGE", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "FAN HOUSING, 1ST STAGE", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "IMPELLER 1ST STAGE", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "CABLE, SPEED SENSOR", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "CONNECTOR - 0.125\" TO 1/4\" DIAMETER CABLE", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "MAGNETIC PICKUP, SPEED SENSOR", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "CARBON BRUSH", "quantity": 6, "status": "Available", "remarks": "" },
      { "partName": "CARBON BRUSH HOLDER", "quantity": 6, "status": "Available", "remarks": "" },
      { "partName": "CONNECTION BOX", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "AUXILIARY CABLE", "quantity": 4, "status": "Available", "remarks": "" },
      { "partName": "MAIN CABLE", "quantity": 3, "status": "Available", "remarks": "" },
      { "partName": "FIELD CABLE", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "1ST STAGE FAN HOUSING PLATE", "quantity": 1, "status": "Available", "remarks": "" }
    ],
    "electricalTests": {
      "irTest": {
        "appliedVoltage": 1000,
        "terminals": ["Armature to G", "Field to G"],
        "standardValue": "Above 1MΩ"
      },
      "windingResistance": {
        "terminals": ["Armature", "Field"],
        "standardValue": "Standard"
      }
    }
  },
  "830 DC wheel motor": {
    "componentType": "KOMATSU 830E DC WHEEL MOTOR",
    "incomingParts": [
      { "partName": "Magnetic pickup", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Brush holder", "quantity": 4, "status": "Available", "remarks": "" },
      { "partName": "Brush", "quantity": 12, "status": "Available", "remarks": "" },
      { "partName": "Armature cable A, AA", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "Magnetic pole cable S, SS, SX, SSX", "quantity": 4, "status": "Available", "remarks": "" },
      { "partName": "Magnetic pickup cable", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "Drive Ring", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Air Baffle", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "Mounting Bolt", "quantity": 10, "status": "Available", "remarks": "" },
      { "partName": "Support, Brush Holder", "quantity": 4, "status": "Available", "remarks": "" },
      { "partName": "Support Bolt", "quantity": 4, "status": "Available", "remarks": "" },
      { "partName": "Sensor Terminal Block", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "Connection Strip", "quantity": 6, "status": "Available", "remarks": "" },
      { "partName": "Jumper (link Strip)", "quantity": 1, "status": "Available", "remarks": "" }
    ],
    "electricalTests": {
      "irTest": {
        "appliedVoltage": 1000,
        "terminals": ["S to G", "SS to G", "A to G", "AA to G"],
        "standardValue": "Above 1MΩ"
      },
      "windingResistance": {
        "terminals": ["S to SS", "A to AA"],
        "standardValue": "Standard"
      }
    }
  },
  "830E Ac alternator": {
    "componentType": "830E AC MAIN ALTERNATOR",
    "incomingParts": [
      { "partName": "Stator Winding", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Rotor Assembly", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Speed Sensor", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Bearing NDE", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Terminal Box cover", "quantity": 1, "status": "Available", "remarks": "" }
    ],
    "electricalTests": {
      "irTest": {
        "appliedVoltage": 1000,
        "terminals": ["U to G", "V to G", "W to G", "Rotor to G"],
        "standardValue": "Above 1MΩ"
      },
      "windingResistance": {
        "terminals": ["U to V", "V to W", "W to U"],
        "standardValue": "Standard"
      }
    }
  },
  "eh5000 alternator": {
    "componentType": "HITACHI EH5000 ALTERNATOR",
    "incomingParts": [
      { "partName": "Bearing Temperature Sensor", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "RPM sensor", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Rectifier Box", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Rectifier", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Rectifier Cover", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Sensor Terminal Box Cover", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Guard", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Auxiliary Cable", "quantity": 3, "status": "Available", "remarks": "" },
      { "partName": "Grease Pipe", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Sensor Terminal Connector", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Sensor Cable Terminal Strip", "quantity": 4, "status": "Available", "remarks": "" }
    ],
    "electricalTests": {
      "irTest": {
        "appliedVoltage": 1000,
        "terminals": ["R to G", "Y to G", "B to G", "T1 to G", "T2 to G", "T3 to G", "F1 to G", "F2 to G", "U to G", "V to G", "W to G"],
        "standardValue": "Above 1MΩ"
      },
      "windingResistance": {
        "terminals": ["R to Y", "Y to B", "B to R", "F1 to F2", "U to V", "V to W", "W to U"],
        "standardValue": "0.2 Ω"
      }
    }
  },
  "Eh5000 wheel motor": {
    "componentType": "HITACHI EH5000 WHEEL MOTOR",
    "incomingParts": [
      { "partName": "HUB", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "COUPLING", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "DISC", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "SPEED SENSOR", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "THERMOMETER", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "SENSOR MOTOR BEARING TEM", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "BUS BAR", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "BREAK DISC", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "BREAK DISC BOLT", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "PARKING BRAKE", "quantity": 2, "status": "Available", "remarks": "" }
    ],
    "electricalTests": {
      "irTest": {
        "appliedVoltage": 1000,
        "terminals": ["R to G", "Y to G", "B to G"],
        "standardValue": "Above 1MΩ"
      },
      "windingResistance": {
        "terminals": ["R to Y", "Y to B", "B to R"],
        "standardValue": "0.6 mΩ"
      }
    }
  },
  "grid blower motor": {
    "componentType": "GRID BLOWER MOTOR",
    "incomingParts": [
      { "partName": "Terminal Box", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Motor Outer Cover", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Carbon Brush", "quantity": 8, "status": "Available", "remarks": "" },
      { "partName": "Carbon Brush Holder", "quantity": 8, "status": "Available", "remarks": "" },
      { "partName": "Covers", "quantity": 6, "status": "Available", "remarks": "" },
      { "partName": "Terminal Link", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "Motor Mounting Bracket", "quantity": 1, "status": "Available", "remarks": "" }
    ],
    "electricalTests": {
      "irTest": {
        "appliedVoltage": 1000,
        "terminals": ["Armature to G", "Field to G"],
        "standardValue": "Above 1MΩ"
      },
      "windingResistance": {
        "terminals": ["Armature A1-A2", "Field F1-F2"],
        "standardValue": "Standard"
      }
    }
  },
  "main blower motor": {
    "componentType": "HITACHI MAIN BLOWER MOTOR",
    "incomingParts": [
      { "partName": "WHEEL", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "BASE", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "CONNECTOR FOR CABLE", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "CONDUIT BOX", "quantity": 1, "status": "Available", "remarks": "" },
      { "partName": "GREASE PIPE", "quantity": 4, "status": "Available", "remarks": "" },
      { "partName": "ELBOW", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "NIPPLE", "quantity": 2, "status": "Available", "remarks": "" },
      { "partName": "NAME PLATE", "quantity": 1, "status": "Available", "remarks": "" }
    ],
    "electricalTests": {
      "irTest": {
        "appliedVoltage": 1000,
        "terminals": ["U to G", "V to G", "W to G"],
        "standardValue": "Above 1MΩ"
      },
      "windingResistance": {
        "terminals": ["U to V", "V to W", "W to U"],
        "standardValue": "Standard"
      }
    }
  }
};

export const getTemplateForJob = (job) => {
  if (!job) return null;
  const desc = (job.description || '').toLowerCase();
  const eqModel = (job.equipmentModel || '').toLowerCase();
  const compType = (job.componentType || '').toLowerCase();

  // 1. Grid Blower Motor
  if (desc.includes('grid blower') || compType.includes('gbm') || desc.includes('gbm') || desc.includes('grid')) {
    return inspectionTemplates['grid blower motor'];
  }
  // 2. Main Blower Motor
  if (desc.includes('main blower') || compType.includes('mbm') || desc.includes('mbm') || desc.includes('main')) {
    return inspectionTemplates['main blower motor'];
  }
  // 3. EH5000 Alternator
  if ((desc.includes('eh5000') || eqModel.includes('eh5000')) && (desc.includes('alternator') || compType.includes('alternator'))) {
    return inspectionTemplates['eh5000 alternator'];
  }
  // 4. EH5000 Wheel Motor
  if ((desc.includes('eh5000') || eqModel.includes('eh5000')) && (desc.includes('wheel') || desc.includes('traction') || compType.includes('motor'))) {
    return inspectionTemplates['Eh5000 wheel motor'];
  }
  // 5. 830 AC Wheel Motor
  if (desc.includes('830') && desc.includes('ac') && (desc.includes('wheel') || desc.includes('motor'))) {
    return inspectionTemplates['830 Ac wheel motor'];
  }
  // 6. 830 DC Wheel Motor
  if (desc.includes('830') && desc.includes('dc') && (desc.includes('wheel') || desc.includes('motor'))) {
    return inspectionTemplates['830 DC wheel motor'];
  }
  // 7. 830 DC Alternator
  if (desc.includes('830') && desc.includes('dc') && desc.includes('alternator')) {
    return inspectionTemplates['830 DC alternator'];
  }
  // 8. 830E AC Alternator
  if (desc.includes('830') && (desc.includes('ac') || desc.includes('830e')) && desc.includes('alternator')) {
    return inspectionTemplates['830E Ac alternator'];
  }

  // Fallbacks
  if (desc.includes('wheel motor') || desc.includes('traction motor')) {
    return inspectionTemplates['830 Ac wheel motor'];
  }
  if (desc.includes('alternator')) {
    return inspectionTemplates['830E Ac alternator'];
  }

  return null;
};
