const url = require('url');
const fetch = require('node-fetch');
const moment = require('moment');

const IndexController = {
    index: async (req, res) => {
        const estados = [
            {nome:'Acre', sigla: 'AC'},
            {nome:'Alagoas', sigla: 'AL'},
            {nome:'Amapá', sigla: 'AP'},
            {nome:'Amazonas', sigla: 'AM'},
            {nome:'Bahia', sigla: 'BA'},
            {nome:'Ceará', sigla: 'CE'},
            {nome:'Distrito Federal', sigla: 'DF'},
            {nome:'Espírito Santo', sigla: 'ES'},
            {nome:'Goiás', sigla: 'GO'},
            {nome:'Maranhão', sigla: 'MA'},
            {nome:'Mato Grosso', sigla: 'MT'},
            {nome:'Mato Grosso do Sul', sigla: 'MS'},
            {nome:'Minas Gerais', sigla: 'MG'},
            {nome:'Pará', sigla: 'PA'},
            {nome:'Paraíba', sigla: 'PB'},
            {nome:'Paraná', sigla: 'PR'},
            {nome:'Pernambuco', sigla: 'PE'},
            {nome:'Piauí', sigla: 'PI'},
            {nome:'Rio de Janeiro', sigla: 'RJ'},
            {nome:'Rio Grande do Norte', sigla: 'RN'},
            {nome:'Rio Grande do Sul', sigla: 'RS'},
            {nome:'Rondônia', sigla: 'RO'},
            {nome:'Roraima', sigla: 'RR'},
            {nome:'Santa Catarina', sigla: 'SC'},
            {nome:'São Paulo', sigla: 'SP'},
            {nome:'Sergipe', sigla: 'SE'},
            {nome:'Tocantins', sigla: 'TO'},
        ];
        let msg = '';
        const pesquisa = url.parse(req.url, true).query;
        
        //Verificação se todos os dados para a pesquisa estão na url e se a data de início é anterior à data de término do período pesquisado
        if (!pesquisa.state || !pesquisa.dateStart || !pesquisa.dateEnd || pesquisa.dateStart > pesquisa.dateEnd ) {
            const cidadesMaiorPercentual = [];
            msg = "Favor preencher corretamente todos os dados para a pesquisa.";
            return res.render('index', {title: 'Covid-19 Brasil', estados, pesquisa, cidadesMaiorPercentual, msg, moment});
        }

        //Requisição dos dados referentes à data inicial do período pesquisado
        try {
            const resultadoInicio = await fetch(`https://brasil.io/api/dataset/covid19/caso/data/?state=${pesquisa.state}&date=${pesquisa.dateStart}`);
            const resIniJson = await resultadoInicio.json();
    
            var dadosInicio = resIniJson.results.map(cidade => {
                let cidades = {};
                cidades.nome = cidade.city;
                cidades.confirmadosInicio = cidade.confirmed;
                cidades.populacao = cidade.estimated_population_2019;
                return (cidades);
            });
        } catch (error) {
            const cidadesMaiorPercentual = [];
            msg = "Erro na requisição, favor tentar novamente.";
            return res.render('index', {title: 'Covid-19 Brasil', estados, pesquisa, cidadesMaiorPercentual, msg, moment});
        }

        //Requisição dos dados referentes à data final do período pesquisado
        try {
            const resultadoTermino = await fetch(`https://brasil.io/api/dataset/covid19/caso/data/?state=${pesquisa.state}&date=${pesquisa.dateEnd}`);
            const resFimJson = await resultadoTermino.json();
    
            var dadosTermino = resFimJson.results.map(cidade => {
                let cidades = {};
                cidades.nome = cidade.city;
                cidades.confirmadosFim = cidade.confirmed;
                cidades.populacao = cidade.estimated_population_2019;
                return (cidades);
            });
        } catch (error) {
            const cidadesMaiorPercentual = [];
            msg = "Erro na requisição, favor tentar novamente.";
            return res.render('index', {title: 'Covid-19 Brasil', estados, pesquisa, cidadesMaiorPercentual, msg, moment});
        }

        //Verificação se há dados disponíveis nas datas pesquisadas
        if (dadosInicio.length === 1 || dadosTermino.length === 1 ) {
            const cidadesMaiorPercentual = [];
            msg = "Não há dados disponíveis para este intervalo.";
            return res.render('index', {title: 'Covid-19 Brasil', estados, pesquisa, cidadesMaiorPercentual, msg, moment});
        }

        //Remoção do item "Importados/Indefinidos" da lista de cidades em ambas as datas do período pesquisado
        const indiceImportadoInic = dadosInicio.indexOf(dadosInicio.find(cidade => cidade.nome==='Importados/Indefinidos'));
        if (indiceImportadoInic >= 0) {
            const importadoInic = dadosInicio.splice(indiceImportadoInic,1);
        }
        
        const indiceImportado = dadosTermino.indexOf(dadosTermino.find(cidade => cidade.nome==='Importados/Indefinidos'));
        if (indiceImportado >= 0 ) {
            const importado = dadosTermino.splice(indiceImportado,1);
        }
        
        //Cálculo da diferença absoluta e percentual dos casos no período pesquisado
        const cidadesIguais = dadosTermino.map(cidade => {
            let cidades = {};
            let igual = dadosInicio.find(cidadeIgual => cidadeIgual.nome === cidade.nome)
            if (igual && !(igual.nome === 'Importados/Indefinidos')) {
                cidades = igual;
                cidades.confirmadosFim = cidade.confirmadosFim;
                cidades.diferencaCasos = cidades.confirmadosFim - cidades.confirmadosInicio;
                cidades.percentualDeCasos = (cidades.diferencaCasos/cidades.populacao * 100).toFixed(2);
            } else {
                cidades = cidade;
                cidades.confirmadosInicio = 0;
                cidades.diferencaCasos = cidades.confirmadosFim;
                cidades.percentualDeCasos = (cidades.diferencaCasos/cidades.populacao * 100).toFixed(2);
            };
            return cidades;
        });

        //Ordenação das 10 cidades com maior aumento percentual de casos em relação à população no período pesquisado
        const cidadesMaiorPercentual = ((cidadesIguais.slice(0,cidadesIguais.length-1)).sort((a, b) => {
            if (a.percentualDeCasos < b.percentualDeCasos) {
                return 1;
            }
            if (a.percentualDeCasos > b.percentualDeCasos) {
                return -1;
            }
            return 0;
        })).slice(0,10);
        
        //Preparação dos dados para o envio ao endpoint da API
        let infosEnvio = [];

        if(cidadesMaiorPercentual[0].nome) {
            infosEnvio = cidadesMaiorPercentual.map((cidade, index) => {
                if(cidade) {
                    let cidades = {};
                    cidades.id = index;
                    cidades.nomeCidade = cidade.nome;
                    cidades.percentualDeCasos = cidade.percentualDeCasos;
                    return cidades;

                }
            });
        } else {
            infosEnvio = {
                msg: "Não há dados disponíveis para este intervalo."
            }
        }
        
        //Envio dos dados via método POST para a API
        try {
            const resposta = await fetch('https://us-central1-lms-nuvem-mestra.cloudfunctions.net/testApi',{
                method: 'post',
                body: JSON.stringify(infosEnvio),
                headers: { 'Content-Type': 'application/json', 'MeuNome': 'Gustavo Barros de Figueiredo'}
            });
        } catch (error) {   
            msg = error;
        }

        //Exibição em tela dos dados das 10 cidades com maior aumento percentual em relação à população no período pesquisado
        return res.render('index', { title: 'Covid-19 Brasil', estados, pesquisa, cidadesMaiorPercentual, msg, moment });
    },
}

module.exports = IndexController;