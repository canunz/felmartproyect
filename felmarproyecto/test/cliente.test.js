const request = require('supertest');
const { app } = require('../app');
const { Cliente, Usuario } = require('../models');
const { expect } = require('chai');

describe('Cliente Controller', () => {
  let testUsuario;
  let testCliente;
  let authToken;

  before(async () => {
    // Crear usuario administrador para pruebas
    testUsuario = await Usuario.create({
      nombre: 'Admin Test',
      email: 'admin@test.com',
      password: '123456',
      rol: 'administrador',
      activo: true
    });

    // Iniciar sesión para obtener token
    const loginResponse = await request(app)
      .post('/login')
      .send({
        email: 'admin@test.com',
        password: '123456'
      });

    authToken = loginResponse.headers['set-cookie'][0];
  });

  after(async () => {
    // Limpiar datos de prueba
    await Cliente.destroy({ where: {} });
    await Usuario.destroy({ where: {} });
  });

  describe('GET /api/clientes', () => {
    it('debería listar todos los clientes', async () => {
      const res = await request(app)
        .get('/api/clientes')
        .set('Cookie', authToken)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.clientes).to.be.an('array');
    });

    it('debería denegar acceso sin autenticación', async () => {
      await request(app)
        .get('/api/clientes')
        .expect(401);
    });
  });

  describe('POST /api/clientes', () => {
    it('debería crear un nuevo cliente', async () => {
      const nuevoCliente = {
        rut: '76.543.210-9',
        nombreEmpresa: 'Empresa Test',
        email: 'test@empresa.com',
        telefono: '+56912345678',
        contactoPrincipal: 'Juan Test',
        direccion: 'Calle Test 123',
        comuna: 'Santiago',
        ciudad: 'Santiago'
      };

      const res = await request(app)
        .post('/api/clientes')
        .set('Cookie', authToken)
        .send(nuevoCliente)
        .expect(201);

      expect(res.body.success).to.be.true;
      expect(res.body.cliente).to.include({
        rut: '76.543.210-9',
        nombre_empresa: 'Empresa Test'
      });

      // Guardar el cliente creado para pruebas posteriores
      testCliente = res.body.cliente;
    });

    it('debería fallar al crear cliente con RUT duplicado', async () => {
      const clienteDuplicado = {
        rut: '76.543.210-9',
        nombreEmpresa: 'Empresa Duplicada',
        email: 'duplicado@empresa.com',
        telefono: '+56987654321',
        contactoPrincipal: 'Pedro Duplicado',
        direccion: 'Calle Duplicada 456',
        comuna: 'Santiago',
        ciudad: 'Santiago'
      };

      const res = await request(app)
        .post('/api/clientes')
        .set('Cookie', authToken)
        .send(clienteDuplicado)
        .expect(400);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('Ya existe un cliente con ese RUT');
    });
  });

  describe('PUT /api/clientes/:id', () => {
    it('debería actualizar un cliente existente', async () => {
      const datosActualizados = {
        rut: '76.543.210-9',
        nombreEmpresa: 'Empresa Test Actualizada',
        email: 'test.actualizado@empresa.com',
        telefono: '+56987654321',
        contactoPrincipal: 'Juan Test Actualizado',
        direccion: 'Calle Test Actualizada 456',
        comuna: 'Santiago',
        ciudad: 'Santiago'
      };

      const res = await request(app)
        .put(`/api/clientes/${testCliente.id}`)
        .set('Cookie', authToken)
        .send(datosActualizados)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.cliente).to.include({
        nombre_empresa: 'Empresa Test Actualizada',
        email: 'test.actualizado@empresa.com'
      });
    });

    it('debería fallar al actualizar cliente inexistente', async () => {
      const res = await request(app)
        .put('/api/clientes/999999')
        .set('Cookie', authToken)
        .send({})
        .expect(404);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('Cliente no encontrado');
    });
  });

  describe('DELETE /api/clientes/:id', () => {
    it('debería eliminar un cliente existente', async () => {
      const res = await request(app)
        .delete(`/api/clientes/${testCliente.id}`)
        .set('Cookie', authToken)
        .expect(200);

      expect(res.body.success).to.be.true;
      expect(res.body.message).to.include('Cliente eliminado exitosamente');

      // Verificar que el cliente ya no existe
      const clienteEliminado = await Cliente.findByPk(testCliente.id);
      expect(clienteEliminado).to.be.null;
    });

    it('debería fallar al eliminar cliente inexistente', async () => {
      const res = await request(app)
        .delete('/api/clientes/999999')
        .set('Cookie', authToken)
        .expect(404);

      expect(res.body.success).to.be.false;
      expect(res.body.message).to.include('Cliente no encontrado');
    });
  });
}); 