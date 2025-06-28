const request = require('supertest');
const { expect } = require('chai');
const app = require('../app');
const { Cotizacion, Region, Comuna } = require('../models');
const { sendMailWithRetry } = require('../config/email.config');
const sinon = require('sinon');

// Mock de la función sendMailWithRetry
const sendMailStub = sinon.stub().resolves({ messageId: 'test-message-id' });
sinon.replace(require('../config/email.config'), 'sendMailWithRetry', sendMailStub);

describe('POST /residuos/cotizaciones/cotizar', () => {
  before(function() {
    this.timeout(10000); // 10 segundos
    return (async () => {
      // Crear región y comuna de prueba si no existen
      await Region.findOrCreate({
        where: { id: 1 },
        defaults: { nombre: 'Región de Prueba' }
      });
      await Comuna.findOrCreate({
        where: { id: 1 },
        defaults: { nombre: 'Comuna de Prueba', region_id: 1 }
      });
    })();
  });

  after(async () => {
    // Limpiar cotizaciones de prueba
    await Cotizacion.destroy({ where: { correo: 'testcliente@correo.com' } });
    sinon.restore();
  });

  it('debe guardar la cotización en la base de datos y enviar el correo al cliente', async function() {
    this.timeout(10000); // 10 segundos
    const datos = {
      nombre: 'Test Cliente',
      rut: '12.345.678-9',
      correo: 'testcliente@correo.com',
      telefono: '+56 9 1234 5678',
      direccion: 'Calle Falsa 123',
      region_id: 1,
      comuna_id: 1,
      nombreEmpresa: 'Empresa Test',
      rutEmpresa: '76.123.456-7',
      residuosCotizados: JSON.stringify([
        {
          residuoId: 1,
          descripcion: 'Aceite usado',
          unidad: 'litros',
          cantidad: 10,
          precioUnitario: 1000,
          moneda: 'CLP',
          subtotal: 10000
        }
      ]),
      total: 11900,
      observaciones: 'Observación de prueba'
    };

    const response = await request(app)
      .post('/residuos/cotizaciones/cotizar')
      .type('form')
      .send(datos);

    expect(response.status).to.equal(200);
    expect(response.text).to.include('Cotización Enviada');

    // Verificar que la cotización se guardó en la base de datos
    const cotizacion = await Cotizacion.findOne({ where: { correo: 'testcliente@correo.com' } });
    expect(cotizacion).to.not.be.null;
    expect(cotizacion.nombre).to.equal('Test Cliente');
    expect(Number(cotizacion.total)).to.equal(11900);
  });
}); 