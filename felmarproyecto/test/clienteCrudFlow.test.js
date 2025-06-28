const request = require('supertest');
const app = require('../app');
const { Cliente, Usuario } = require('../models');
const { expect } = require('chai');

// IDs de prueba (ajusta según tus datos de regiones y comunas en la BD)
const TEST_REGION_ID = 12; // Región de Los Lagos
const TEST_COMUNA_ID = 1;  // Puerto Montt

describe('Flujo CRUD completo de Cliente (con región y comuna)', () => {
  let authToken;
  let testClienteRut = '76.543.210-K';
  let testUsuarioEmail = `crudcliente+${Date.now()}@felmart.cl`;

  before(async () => {
    // Eliminar usuario y cliente de pruebas si existen
    await Cliente.destroy({ where: { rut: testClienteRut } });
    await Usuario.destroy({ where: { email: testUsuarioEmail } });

    // Login como administrador real
    const loginRes = await request(app)
      .post('/login')
      .send({ email: 'fa.araujo@duocuc.cl', password: 'admi1234' });
    authToken = loginRes.headers['set-cookie'];
  });

  after(async () => {
    await Cliente.destroy({ where: { rut: testClienteRut } });
    await Usuario.destroy({ where: { email: testUsuarioEmail } });
  });

  it('debería crear un nuevo cliente', async () => {
    const nuevoCliente = {
      rut: testClienteRut,
      nombreEmpresa: 'Empresa CRUD',
      email: testUsuarioEmail,
      password: '123456',
      telefono: '+56911112222',
      contactoPrincipal: 'Contacto CRUD',
      direccion: 'Calle CRUD 123',
      comuna_id: TEST_COMUNA_ID,
      region_id: TEST_REGION_ID
    };
    const res = await request(app)
      .post('/api/clientes')
      .set('Cookie', authToken)
      .send(nuevoCliente);
    if (res.status !== 201) {
      throw new Error('ERROR CREAR CLIENTE: ' + JSON.stringify(res.body, null, 2));
    }
    expect(res.status).to.equal(201);
    expect(res.body.success).to.be.true;
    expect(res.body.cliente).to.include({ rut: testClienteRut });
  });

  it('debería listar los clientes y mostrar la región y comuna asociada', async () => {
    const res = await request(app)
      .get('/api/clientes')
      .set('Cookie', authToken)
      .expect(200);
    throw new Error('LISTAR CLIENTES: ' + JSON.stringify(res.body, null, 2));
    expect(res.body.success).to.be.true;
    const cliente = res.body.clientes.find(c => c.rut === testClienteRut);
    expect(cliente).to.exist;
    expect(cliente.Comuna).to.exist;
    expect(cliente.Comuna.nombre).to.be.a('string');
    expect(cliente.Comuna.Region).to.exist;
    expect(cliente.Comuna.Region.nombre).to.be.a('string');
  });

  it('debería obtener el cliente por rut y mostrar la región y comuna asociada', async () => {
    const res = await request(app)
      .get(`/api/clientes/${testClienteRut}`)
      .set('Cookie', authToken)
      .expect(200);
    throw new Error('OBTENER CLIENTE: ' + JSON.stringify(res.body, null, 2));
    expect(res.body.success).to.be.true;
    expect(res.body.cliente.rut).to.equal(testClienteRut);
    expect(res.body.cliente.Comuna).to.exist;
    expect(res.body.cliente.Comuna.Region).to.exist;
  });

  it('debería actualizar el cliente', async () => {
    const datosActualizados = {
      nombreEmpresa: 'Empresa CRUD Actualizada',
      email: 'empresa.crud.actualizada@felmart.cl',
      telefono: '+56933334444',
      contactoPrincipal: 'Contacto CRUD Actualizado',
      direccion: 'Calle CRUD Actualizada 456',
      comuna_id: TEST_COMUNA_ID
    };
    const res = await request(app)
      .put(`/api/clientes/${testClienteRut}`)
      .set('Cookie', authToken)
      .send(datosActualizados)
      .expect(200);
    throw new Error('ACTUALIZAR CLIENTE: ' + JSON.stringify(res.body, null, 2));
    expect(res.body.success).to.be.true;
    expect(res.body.cliente.nombre_empresa).to.equal('Empresa CRUD Actualizada');
  });

  it('debería eliminar el cliente', async () => {
    const res = await request(app)
      .delete(`/api/clientes/${testClienteRut}`)
      .set('Cookie', authToken)
      .expect(200);
    expect(res.body.success).to.be.true;
    expect(res.body.message).to.include('Cliente eliminado exitosamente');
    // Verificar que ya no existe
    const clienteEliminado = await Cliente.findByPk(testClienteRut);
    expect(clienteEliminado).to.be.null;
  });
}); 