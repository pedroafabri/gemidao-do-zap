import Bluebird, { reject } from 'bluebird';
import agent from 'superagent';
import promisifyAgent from 'superagent-promise';
import config from 'config';
import fs from 'fs';
import { green, yellow } from 'colors/safe'

const request = promisifyAgent(agent, Bluebird);
const route = path => `https://api.totalvoice.com.br${path}`;
const configFile = '../config/default.json';

const setDefaultToken = (token) =>{
    console.log("Diretorio: " + process.cwd());
    var file = require(configFile);
    file.TotalVoice.Token = token;
    
    let path = require('path').resolve(__dirname, configFile);
    
    fs.writeFile(path, JSON.stringify(file, null, 2),{encoding:'utf8',flag:'w'}, (err) => {
      if (err) {
            console.log(yellow('⚠ Não foi possível gravar o arquivo config.json: ' + err.message));
            return;
      }
      console.log(green('✔ Token "'+token+'" definido como padrão.'));
    });
}

const gemidaoInText = 'OOOWH AHHHWN WOOOO AAAAHN WAAAAA AAAAAAHN ANN WAAA!\n'
    + 'Voce caiu no gemidao do zap';

const sms = (to, token) => request.post(route('/sms'))
    .set('Access-Token', token)
    .set('Accept', 'application/json')
    .send({ numero_destino: to, mensagem: gemidaoInText });

const call = (from, to, token) => request.post(route('/composto'))
    .set('Access-Token', token)
    .set('Accept', 'application/json')
    .send({
        numero_destino: to,
        dados: [
            {
                acao: 'audio',
                acao_dados: {
                    url_audio: 'https://github.com/haskellcamargo/gemidao-do-zap/raw/master/resources/gemidao.mp3'
                }
            }
        ],
        bina: from
    });

export default function gemidao(args) {
    let token = args.token || config.get('TotalVoice.Token');
    
    if (!/^[a-f0-9]{32}$/.test(token)) {
        return reject(new Error('Token "'+token+'" inválido. Obtenha um em https://totalvoice.com.br'));
    }

    //Guarda o token na configuração, se desejado
    if (args.set_token) {
        if (!/^[a-f0-9]{32}$/.test(args.token)) {
            return reject(new Error('O comando "--set_token" requer um token TotalVoice válido. Obtenha um em https://totalvoice.com.br'));
        }
        setDefaultToken(args.token);
    }

    if (!/^[0-9]{10,11}$/.test(args.para)) {
        return reject(new Error('Número de telefone inválido: ' + args.para));
    }

    const action = args.sms
        ? sms(args.para, token)
        : call(args.de, args.para, token);

    return action
        .catch(err => {
            if (err.status === 405 || err.status === 403) {
                return reject(new Error((err.body || err.response.body).mensagem));
            }

            return reject(err);
        });
}
