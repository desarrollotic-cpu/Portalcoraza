const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Leer .env
const envPath = path.join(__dirname, 'apps/api/.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const url = process.env.DATABASE_URL;
const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});

// Datos de ejemplo realistas para 2026
const datos = [
  // H — RRHH
  { codigo: 'H1', periodos: [
    { p:'01', meta:8,  val:6.5  }, { p:'02', meta:8,  val:9.2  }, { p:'03', meta:8,  val:7.1  },
    { p:'04', meta:8,  val:8.8  }, { p:'05', meta:8,  val:5.9  }, { p:'06', meta:8,  val:10.2 },
    { p:'07', meta:8,  val:7.5  }
  ]},
  { codigo: 'H2', periodos: [
    { p:'01', meta:5,  val:3.2  }, { p:'02', meta:5,  val:4.8  }, { p:'03', meta:5,  val:6.1  },
    { p:'04', meta:5,  val:4.0  }, { p:'05', meta:5,  val:5.5  }, { p:'06', meta:5,  val:3.7  },
    { p:'07', meta:5,  val:4.2  }
  ]},
  { codigo: 'H3', periodos: [
    { p:'T1', meta:80, val:85   }, { p:'T2', meta:80, val:72   }
  ]},
  { codigo: 'H4', periodos: [
    { p:'ANUAL', meta:75, val:78 }
  ]},
  // C — Clientes
  { codigo: 'C1', periodos: [
    { p:'T1', meta:85, val:88   }, { p:'T2', meta:85, val:82   }
  ]},
  { codigo: 'C2', periodos: [
    { p:'01', meta:10, val:7    }, { p:'02', meta:10, val:12   }, { p:'03', meta:10, val:8    },
    { p:'04', meta:10, val:6    }, { p:'05', meta:10, val:9    }, { p:'06', meta:10, val:11   },
    { p:'07', meta:10, val:5    }
  ]},
  { codigo: 'C3', periodos: [
    { p:'T1', meta:90, val:93   }, { p:'T2', meta:90, val:88   }
  ]},
  { codigo: 'C4', periodos: [
    { p:'01', meta:3,  val:2    }, { p:'02', meta:3,  val:4    }, { p:'03', meta:3,  val:1    },
    { p:'04', meta:3,  val:3    }, { p:'05', meta:3,  val:2    }, { p:'06', meta:3,  val:5    },
    { p:'07', meta:3,  val:2    }
  ]},
  // E — Financiero
  { codigo: 'E1', periodos: [
    { p:'01', meta:0,  val:45000000 }, { p:'02', meta:0, val:38000000 },
    { p:'03', meta:0,  val:52000000 }, { p:'04', meta:0, val:61000000 },
    { p:'05', meta:0,  val:49000000 }, { p:'06', meta:0, val:55000000 },
    { p:'07', meta:0,  val:58000000 }
  ]},
  { codigo: 'E2', periodos: [
    { p:'01', meta:15, val:18   }, { p:'02', meta:15, val:14   }, { p:'03', meta:15, val:16   },
    { p:'04', meta:15, val:19   }, { p:'05', meta:15, val:13   }, { p:'06', meta:15, val:17   },
    { p:'07', meta:15, val:20   }
  ]},
  { codigo: 'E4', periodos: [
    { p:'01', meta:100, val:102 }, { p:'02', meta:100, val:98  }, { p:'03', meta:100, val:105 },
    { p:'04', meta:100, val:97  }, { p:'05', meta:100, val:101 }, { p:'06', meta:100, val:99  },
    { p:'07', meta:100, val:103 }
  ]},
  // O — Operación
  { codigo: 'O1', periodos: [
    { p:'01', meta:3,  val:2    }, { p:'02', meta:3,  val:4    }, { p:'03', meta:3,  val:1    },
    { p:'04', meta:3,  val:3    }, { p:'05', meta:3,  val:2    }, { p:'06', meta:3,  val:5    },
    { p:'07', meta:3,  val:2    }
  ]},
  { codigo: 'O2', periodos: [
    { p:'01', meta:5,  val:3    }, { p:'02', meta:5,  val:7    }, { p:'03', meta:5,  val:4    },
    { p:'04', meta:5,  val:6    }, { p:'05', meta:5,  val:2    }, { p:'06', meta:5,  val:8    },
    { p:'07', meta:5,  val:3    }
  ]},
  { codigo: 'O3', periodos: [
    { p:'01', meta:90, val:94   }, { p:'02', meta:90, val:88   }, { p:'03', meta:90, val:92   },
    { p:'04', meta:90, val:95   }, { p:'05', meta:90, val:87   }, { p:'06', meta:90, val:91   },
    { p:'07', meta:90, val:93   }
  ]},
  { codigo: 'O4', periodos: [
    { p:'01', meta:2,  val:1    }, { p:'02', meta:2,  val:3    }, { p:'03', meta:2,  val:0    },
    { p:'04', meta:2,  val:2    }, { p:'05', meta:2,  val:1    }, { p:'06', meta:2,  val:4    },
    { p:'07', meta:2,  val:1    }
  ]},
  // P — Procesos
  { codigo: 'P1', periodos: [
    { p:'01', meta:95, val:98   }, { p:'02', meta:95, val:92   }, { p:'03', meta:95, val:96   },
    { p:'04', meta:95, val:100  }, { p:'05', meta:95, val:89   }, { p:'06', meta:95, val:97   },
    { p:'07', meta:95, val:95   }
  ]},
  { codigo: 'P2', periodos: [
    { p:'01', meta:5,  val:3    }, { p:'02', meta:5,  val:6    }, { p:'03', meta:5,  val:4    },
    { p:'04', meta:5,  val:2    }, { p:'05', meta:5,  val:5    }, { p:'06', meta:5,  val:7    },
    { p:'07', meta:5,  val:3    }
  ]},
  { codigo: 'P3', periodos: [
    { p:'T1', meta:90, val:93   }, { p:'T2', meta:90, val:87   }
  ]},
  // I — Informática
  { codigo: 'I1', periodos: [
    { p:'T1', meta:90, val:95   }, { p:'T2', meta:90, val:88   }
  ]},
  { codigo: 'I2', periodos: [
    { p:'T1', meta:80, val:85   }, { p:'T2', meta:80, val:78   }
  ]},
  { codigo: 'I3', periodos: [
    { p:'T1', meta:85, val:90   }, { p:'T2', meta:85, val:82   }
  ]},
  { codigo: 'I4', periodos: [
    { p:'T1', meta:90, val:92   }, { p:'T2', meta:90, val:86   }
  ]},
  // E-SARLAFT
  { codigo: 'E-SARLAFT', periodos: [
    { p:'T1', meta:95, val:100  }, { p:'T2', meta:95, val:93   }
  ]},
];

function semaforo(sentido, meta, valor) {
  if (meta === 0) return 'VERDE';
  const pct = sentido === 'ASCENDENTE' ? (valor / meta) * 100 : (meta / valor) * 100;
  if (pct >= 100) return 'AZUL';
  if (pct >= 90) return 'VERDE';
  if (pct >= 75) return 'AMARILLO';
  return 'ROJO';
}

async function main() {
  await client.connect();
  console.log('✅ Conectado');

  // Obtener todos los indicadores activos
  const { rows: indicadores } = await client.query(`
    SELECT id, codigo, sentido FROM sig_indicadores WHERE activo = TRUE
  `);

  const indMap = {};
  indicadores.forEach(i => indMap[i.codigo] = i);

  let inserted = 0;
  for (const d of datos) {
    const ind = indMap[d.codigo];
    if (!ind) { console.log(`⚠️  No encontrado: ${d.codigo}`); continue; }
    for (const p of d.periodos) {
      const color = semaforo(ind.sentido || 'ASCENDENTE', p.meta, p.val);
      await client.query(`
        INSERT INTO sig_resultados (indicador_id, anio, periodo, meta_snapshot, valor_resultado, observaciones, color_semaforo, seguimiento, capturado_por)
        VALUES ($1, 2026, $2, $3, $4, 'Dato de arranque 2026', $5, 'ABIERTO', 'seed-2026')
        ON CONFLICT (indicador_id, anio, periodo) DO UPDATE
          SET valor_resultado = EXCLUDED.valor_resultado,
              meta_snapshot = EXCLUDED.meta_snapshot,
              color_semaforo = EXCLUDED.color_semaforo
      `, [ind.id, p.p, p.meta, p.val, color]);
      inserted++;
    }
  }

  console.log(`✅ ${inserted} registros insertados`);

  // Resumen de colores
  const { rows: resumen } = await client.query(`
    SELECT color_semaforo, COUNT(*) as total
    FROM sig_resultados WHERE anio = 2026
    GROUP BY color_semaforo ORDER BY color_semaforo
  `);
  console.log('\n📊 Semáforo 2026:');
  console.table(resumen);

  await client.end();
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
