-- Migración: actualizar preguntas SST al texto exacto del Formato IPT y seguimiento (Excel oficial)
-- Fecha: 2026-09-02

UPDATE sst_checklist_items SET pregunta = '¿Las vías se encuentran despejadas, libres de elementos que podrían causar caídas (hojas, pasto, barro, fierros, cajas, madera, grasas, aceites, etc.)?', categoria = 'Condiciones de seguridad' WHERE codigo = 1;
UPDATE sst_checklist_items SET pregunta = '¿El suelo, los andenes, las calles, zonas de parqueo, y el espacio público por donde deben transitar por la labor realizada se encuentran en buen estado (Sin desniveles, huecos, baldosas sueltas o levantadas)?', categoria = 'Condiciones de seguridad' WHERE codigo = 2;
UPDATE sst_checklist_items SET pregunta = '¿Las conexiones eléctricas y tomas corriente se encuentran en buen estado y protegidos o canalizados?', categoria = 'Condiciones de seguridad' WHERE codigo = 3;
UPDATE sst_checklist_items SET pregunta = '¿Las rutas de tránsito vehicular están separadas a las rutas de tránsito peatonal y se encuentran señalizadas?', categoria = 'Condiciones de seguridad' WHERE codigo = 4;
UPDATE sst_checklist_items SET pregunta = '¿Se evidencia un espacio adecuado para disponer los paquetes y domicilios y que no obstaculicen el paso?', categoria = 'Condiciones de seguridad' WHERE codigo = 5;
UPDATE sst_checklist_items SET pregunta = '¿Las escaleras por donde transita tienen pasamanos? ¿Y están firmemente asegurado?', categoria = 'Condiciones de seguridad' WHERE codigo = 6;
UPDATE sst_checklist_items SET pregunta = '¿Los escalones de las escaleras y las rampas cuentan con cintas antideslizantes?', categoria = 'Condiciones de seguridad' WHERE codigo = 7;
UPDATE sst_checklist_items SET pregunta = '¿La huella de los escalones permiten que el pie quede completamente apoyado?', categoria = 'Condiciones de seguridad' WHERE codigo = 8;
UPDATE sst_checklist_items SET pregunta = '¿Se cuenta con servicios sanitarios y zona de alimentación independientes?', categoria = 'Condiciones de seguridad' WHERE codigo = 9;
UPDATE sst_checklist_items SET pregunta = '¿Las armas de fuego están en buen estado y se les realiza mantenimiento periódico? ¿Cuándo fue el último mantenimiento?', categoria = 'Condiciones de seguridad' WHERE codigo = 10;
UPDATE sst_checklist_items SET pregunta = '¿El personal cuenta con el examen psicofísico para el manejo de armas y está actualizado?', categoria = 'Condiciones de seguridad' WHERE codigo = 11;
UPDATE sst_checklist_items SET pregunta = '¿Se evidencia extintores u otros medios de lucha contra el fuego, señalizados, vigentes, de fácil acceso y en buen estado?', categoria = 'Condiciones de seguridad' WHERE codigo = 12;
UPDATE sst_checklist_items SET pregunta = '¿Existe plan de emergencia, alarmas, altavoces, señalización de emergencia, punto de encuentro u otros dispositivos de notificación de una emergencia y el personal tiene claridad de cómo actuar frente a una emergencia según los protocolos de la empresa cliente?', categoria = 'Condiciones de seguridad' WHERE codigo = 13;
UPDATE sst_checklist_items SET pregunta = '¿Se evidencia botiquín de primeros auxilios con insumos vigentes, de fácil acceso y señalizado?', categoria = 'Condiciones de seguridad' WHERE codigo = 14;
UPDATE sst_checklist_items SET pregunta = '¿Se evidencia camilla de emergencias en el puesto de trabajo?', categoria = 'Condiciones de seguridad' WHERE codigo = 15;
UPDATE sst_checklist_items SET pregunta = '¿Dispone el puesto de una silla ergonómica en buen estado que le permita al trabajador mantener una postura cómoda?', categoria = 'Biomecánicos' WHERE codigo = 16;
UPDATE sst_checklist_items SET pregunta = '¿Se encuentran los implementos de trabajo distribuidos adecuadamente (computadores, pantallas de monitoreo, teléfono, citófonos, botonera, etc.)?', categoria = 'Biomecánicos' WHERE codigo = 17;
UPDATE sst_checklist_items SET pregunta = '¿Se evidencia manipulación de cargas (halar, levantar, y/o empujar)?', categoria = 'Biomecánicos' WHERE codigo = 18;
UPDATE sst_checklist_items SET pregunta = '¿Los vigilantes pueden alternar posturas de pie y sentado durante la jornada laboral?', categoria = 'Biomecánicos' WHERE codigo = 19;
UPDATE sst_checklist_items SET pregunta = '¿Se evidencia movimiento repetitivo (Digitar, escribir, hundir botones, contestar teléfonos) durante la jornada laboral?', categoria = 'Biomecánicos' WHERE codigo = 20;
UPDATE sst_checklist_items SET pregunta = '¿Se evidencia la realización de movimientos inadecuados de tronco (flexión y giros de tronco)?', categoria = 'Biomecánicos' WHERE codigo = 21;
UPDATE sst_checklist_items SET pregunta = '¿Se hacen pausas activas o estiramientos en el puesto de trabajo?', categoria = 'Biomecánicos' WHERE codigo = 22;
UPDATE sst_checklist_items SET pregunta = '¿Se evidencia derrame de líquidos, sólidos, polvo, escombros u otros, en las áreas de desplazamiento?', categoria = 'Químico' WHERE codigo = 23;
UPDATE sst_checklist_items SET pregunta = '¿Las sustancias químicas se encuentran rotuladas, almacenadas en sitios apropiados? (Identificar cuáles son las sustancias químicas a las que se encuentra expuesto el vigilante)', categoria = 'Químico' WHERE codigo = 24;
UPDATE sst_checklist_items SET pregunta = '¿Existe buena iluminación en pasillos, portería, zonas comunes, y demás áreas de circulación?', categoria = 'Físico' WHERE codigo = 25;
UPDATE sst_checklist_items SET pregunta = '¿Se evidencia exposición a ruido continuo mientras realiza la labor?', categoria = 'Físico' WHERE codigo = 26;
UPDATE sst_checklist_items SET pregunta = '¿Al realizar el control perimetral y/o en las porterías está expuesto a riesgo biológico, fluidos corporales, animales o insectos ponzoñosos o callejeros?', categoria = 'Biológico' WHERE codigo = 27;
UPDATE sst_checklist_items SET pregunta = '¿Todas las tareas a realizar, se encuentran en las consignas y han sido divulgadas?', categoria = 'Psicosocial' WHERE codigo = 28;
UPDATE sst_checklist_items SET pregunta = '¿El jefe inmediato maneja una comunicación asertiva para informar consignas y novedades?', categoria = 'Psicosocial' WHERE codigo = 29;
UPDATE sst_checklist_items SET pregunta = '¿La tarea requiere de altos niveles de concentración, atención sostenida y memoria?', categoria = 'Psicosocial' WHERE codigo = 30;
UPDATE sst_checklist_items SET pregunta = '¿Se evidencia exceso de confianza para ejecutar la labor?', categoria = 'Psicosocial' WHERE codigo = 31;
UPDATE sst_checklist_items SET pregunta = '¿Los vigilantes hacen uso de la dotación suministrada por la cooperativa, y según las condiciones del entorno y/o la actividad a realizar y se encuentran en buen estado? (Botas de seguridad, carpa, botas pantaneras, goliana, linterna y sombrilla, entre otros)', categoria = 'Psicosocial' WHERE codigo = 32;
UPDATE sst_checklist_items SET pregunta = '¿Los empleados conocen el procedimiento para el reporte de accidentes e incidentes, condiciones y actos inseguros?', categoria = 'Psicosocial' WHERE codigo = 33;
UPDATE sst_checklist_items SET pregunta = 'OTROS (incorpore otros riesgos que pueda observar)', categoria = 'Otros' WHERE codigo = 34;
