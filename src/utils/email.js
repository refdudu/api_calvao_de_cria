class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Calvão de Cria <${process.env.EMAIL_FROM}>`;
  }

  async send(subject, message) {
    const emailContent = {
      to: this.to,
      from: this.from,
      subject,
      message,
      url: this.url,
    };

    console.log('--- SIMULANDO ENVIO DE E-MAIL ---');
    console.log(emailContent);
    console.log('---------------------------------');

    // QUANDO FOR IMPLEMENTAR UM SERVIÇO REAL:
    // 1. Instale um pacote como nodemailer, @sendgrid/mail, etc.
    // 2. Configure o "transporter" com suas credenciais.
    // 3. Substitua os console.log acima pela chamada real de envio, ex:
    //    await transporter.sendMail({
    //      to: this.to,
    //      from: this.from,
    //      subject,
    //      html: <seu_template_html_com_a_mensagem_e_url>
    //    });
  }

  async sendPasswordReset() {
    const subject = 'Seu token para redefinição de senha (válido por 10 minutos)';
    const message = `Esqueceu sua senha? Envie uma requisição PATCH com sua nova senha para: ${this.url}.\nSe você não esqueceu sua senha, por favor ignore este e-mail!`;
    await this.send(subject, message);
  }
}

module.exports = Email;
