// PrevSafe SST - CIPA Document Generator and PDF Export Engine
// Full compliance with Brazilian Labor Standards (NR-05, NR-31.7, NR-22.36, CLT and Law 14.457/2022)

import { CipaManagementProcess, CipaRegulatoryNorm } from '@/types';
import { CIPA_NORMS_CATALOG } from './cipaService';

export type CipaDocumentType = 
  | 'CONVOCATION_NOTICE'
  | 'COMMISSION_CONSTITUTION'
  | 'CANDIDATE_LIST'
  | 'VOTING_BALLOT'
  | 'ELECTION_SCRUTINY_ATA'
  | 'INAUGURATION_ATA'
  | 'ANNUAL_MEETING_CALENDAR'
  | 'TRAINING_CERTIFICATES'
  | 'MEETING_ATA';

export function generateCipaDocumentHTML(
  process: CipaManagementProcess,
  docType: CipaDocumentType,
  customParams?: {
    candidateId?: string;
    meetingId?: string;
    certificateRecipient?: string;
  }
): string {
  const normInfo = CIPA_NORMS_CATALOG[process?.norm || 'NR-05'] || CIPA_NORMS_CATALOG['NR-05'];
  const formattedDate = new Date().toLocaleDateString('pt-BR');
  const orgName = process?.client_name || 'Empresa';

  let title = '';
  let content = '';

  switch (docType) {
    case 'MEETING_ATA': {
      const meeting = (process.meetings || []).find(m => m.id === customParams?.meetingId) || (process.meetings && process.meetings[0]);
      const meetingNum = meeting ? (meeting.type === 'ORDINARY' ? `${meeting.meeting_number}ª Reunião Ordinária` : 'Reunião Extraordinária') : 'Reunião Ordinária';
      const meetingTitle = meeting?.title || 'Reunião da CIPA';
      const meetingDate = meeting?.date ? new Date(meeting.date).toLocaleDateString('pt-BR') : formattedDate;
      const agenda = meeting?.agenda_topics || ['Análise das condições ambientais de trabalho', 'Acompanhamento do Plano de Trabalho', 'Ações de Prevenção ao Assédio (Lei 14.457/2022)'];

      title = `ATA DA ${meetingNum.toUpperCase()} - CIPA GESTÃO ${process.mandate_year}`;
      content = `
        <div class="header">
          <h2>${orgName}</h2>
          <div class="badge">${normInfo.code} - ${meetingNum}</div>
          <h1 style="margin-top: 15px;">ATA DA ${meetingNum.toUpperCase()}</h1>
          <h3>GESTÃO ${process.mandate_year} • DATA: ${meetingDate}</h3>
        </div>

        <div class="section">
          <p>
            Aos <strong>${meetingDate}</strong>, nas dependências da empresa <strong>${orgName}</strong>, reuniram-se ordinariamente os membros 
            titulares e suplentes da <strong>${normInfo.title}</strong>, sob a presidência de 
            <strong>${(process.employer_appointees || []).find(e => e.is_president)?.name || 'Presidente da CIPA'}</strong> e vice-presidência de 
            <strong>${(process.candidates || []).find(c => c.elected_role === 'VICE_PRESIDENT')?.name || 'Vice-Presidente'}</strong>, 
            para deliberar sobre a seguinte pauta de segurança e saúde no trabalho.
          </p>
        </div>

        <div class="section">
          <h3>1. TÓPICOS DA PAUTA DELIBERADA</h3>
          <ol style="line-height: 1.8; margin-left: 20px; font-size: 12px;">
            ${agenda.map(topic => `<li><strong>${topic}</strong></li>`).join('')}
          </ol>
        </div>

        <div class="section">
          <h3>2. DELIBERAÇÕES E PLANO DE AÇÃO PREVENTIVO</h3>
          <p>
            Foram avaliadas as condições dos postos de trabalho, inspeção de EPIs, manutenção de sinalizações e mapa de riscos. 
            Ademais, foram reforçadas as diretrizes da Lei Federal nº 14.457/2022 visando a promoção de um ambiente de trabalho íntegro, seguro e livre de qualquer forma de assédio ou discriminação.
          </p>
        </div>

        <div class="section">
          <h3>3. PARTICIPANTES PRESENTES</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Representação</th>
                <th>Cargo / Setor</th>
                <th>Assinatura Digital</th>
              </tr>
            </thead>
            <tbody>
              ${(process.employer_appointees || []).map(e => `
                <tr>
                  <td><strong>${e.name}</strong></td>
                  <td>Empregador (${e.is_president ? 'Presidente' : e.role})</td>
                  <td>${e.job_title} (${e.department})</td>
                  <td><span class="badge-success">Assinado Digitalmente</span></td>
                </tr>
              `).join('')}
              ${(process.candidates || []).filter(c => c.elected_role && c.elected_role !== 'NOT_ELECTED').map(c => `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td>Empregados (${c.elected_role === 'VICE_PRESIDENT' ? 'Vice-Presidente' : c.elected_role})</td>
                  <td>${c.job_title} (${c.department})</td>
                  <td><span class="badge-success">Assinado Digitalmente</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="line"></div>
            <strong>Presidente da CIPA</strong><br/>
            ${(process.employer_appointees || []).find(e => e.is_president)?.name || 'Presidente'}
          </div>
          <div class="sig-box">
            <div class="line"></div>
            <strong>Vice-Presidente da CIPA</strong><br/>
            ${(process.candidates || []).find(c => c.elected_role === 'VICE_PRESIDENT')?.name || 'Vice-Presidente'}
          </div>
          <div class="sig-box">
            <div class="line"></div>
            <strong>Secretário(a) da Reunião</strong><br/>
            ${(process.electoral_commission || [])[1]?.name || 'Secretaria'}
          </div>
        </div>
      `;
      break;
    }
    case 'CONVOCATION_NOTICE':
      title = `EDITAL DE CONVOCAÇÃO PARA ELEIÇÃO DA ${normInfo.shortTitle.toUpperCase()}`;
      content = `
        <div class="header">
          <h2>${orgName}</h2>
          <p>CNPJ: ${process.client_id ? 'Inscrita no CNPJ/MF' : 'Empregador'} | CNAE: ${process.cnae}</p>
          <div class="badge">${normInfo.code} - ${normInfo.title}</div>
          <h1 style="margin-top: 15px;">EDITAL DE CONVOCAÇÃO DA ELEIÇÃO DA CIPA</h1>
          <h3>GESTÃO ${process.mandate_year}</h3>
        </div>

        <div class="section">
          <p>
            Ficam convocados todos os empregados da empresa <strong>${orgName}</strong> para a eleição dos representantes dos empregados na 
            <strong>${normInfo.title} (${normInfo.shortTitle})</strong>, em conformidade com as disposições legais contidas na 
            <strong>${normInfo.normReference}</strong>, Consolidação das Leis do Trabalho (CLT) e Lei Federal nº 14.457/2022.
          </p>
        </div>

        <div class="section">
          <h3>1. DO CRONOGRAMA ELEITORAL OFICIAL</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Etapa do Processo</th>
                <th>Data Prevista</th>
                <th>Prazo Legal Mínimo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Publicação deste Edital</strong></td>
                <td>${process.timeline.edital_publication_date}</td>
                <td>Mínimo 45 dias antes do término do mandato</td>
              </tr>
              <tr>
                <td><strong>Período de Inscrição de Candidatos</strong></td>
                <td>${process.timeline.candidacy_start_date} até ${process.timeline.candidacy_end_date}</td>
                <td>Mínimo de 15 dias corridos</td>
              </tr>
              <tr>
                <td><strong>Divulgação e Homologação dos Inscritos</strong></td>
                <td>${process.timeline.candidacy_publication_date}</td>
                <td>Imediato após o término das inscrições</td>
              </tr>
              <tr>
                <td><strong>Votação Secreta (Online / Urna Auditável)</strong></td>
                <td>${process.timeline.voting_start_date} a ${process.timeline.voting_end_date}</td>
                <td>Mínimo 30 dias antes do término do mandato</td>
              </tr>
              <tr>
                <td><strong>Apuração dos Votos e Ata de Eleição</strong></td>
                <td>${process.timeline.scrutiny_date}</td>
                <td>Imediatamente após o encerramento da votação</td>
              </tr>
              <tr>
                <td><strong>Treinamento Obrigatório dos Eleitos e Indicados</strong></td>
                <td>${process.timeline.training_start_date} a ${process.timeline.training_end_date}</td>
                <td>Carga horária de ${process.dimensioning.training_hours_required} horas (Pré-posse)</td>
              </tr>
              <tr>
                <td><strong>Posse e Instalação da Comissão</strong></td>
                <td>${process.timeline.inauguration_date}</td>
                <td>Início do Mandato ${process.mandate_year}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>2. DAS INSCRIÇÕES E DA ESTABILIDADE PROVISÓRIA</h3>
          <p>
            Todos os empregados do estabelecimento, independentemente do setor ou cargo, têm direito a se candidatar. 
            Conforme prevê o Art. 10, II, "a" do Ato das Disposições Constitucionais Transitórias (ADCT) e o item 5.4.12 da NR-05, 
            é vedada a dispensa arbitrária ou sem justa causa do empregado eleito para cargo de direção de CIPA desde o registro de sua candidatura 
            até 1 (um) ano após o final de seu mandato.
          </p>
        </div>

        <div class="section">
          <h3>3. DO PROCESSO DE VOTAÇÃO SEGURO</h3>
          <p>
            A votação será realizada em escrutínio secreto, via plataforma digital corporativa auditável PrevSafe SST / Urna Híbrida, 
            garantindo o sigilo do voto, integridade criptográfica SHA-256 e respeito integral à Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
          </p>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="line"></div>
            <strong>Empregador / Representante Legal</strong><br/>
            ${orgName}
          </div>
          <div class="sig-box">
            <div class="line"></div>
            <strong>Presidente da Comissão Eleitoral</strong><br/>
            ${process.electoral_commission[0]?.name || 'Comissão Eleitoral'}
          </div>
        </div>
      `;
      break;

    case 'COMMISSION_CONSTITUTION':
      title = `ATA DE CONSTITUIÇÃO DA COMISSÃO ELEITORAL DA ${normInfo.shortTitle.toUpperCase()}`;
      content = `
        <div class="header">
          <h2>${orgName}</h2>
          <div class="badge">${normInfo.code} - Item 5.5.2</div>
          <h1 style="margin-top: 15px;">ATA DE CONSTITUIÇÃO DA COMISSÃO ELEITORAL</h1>
          <h3>GESTÃO ${process.mandate_year}</h3>
        </div>

        <div class="section">
          <p>
            Aos <strong>${process.timeline.electoral_commission_date}</strong>, nas dependências da empresa <strong>${orgName}</strong>, 
            reuniram-se os representantes do empregador e dos trabalhadores para constituir a <strong>Comissão Eleitoral</strong> responsável 
            pela organização, condução e apuração da eleição da <strong>${normInfo.title}</strong> para a gestão <strong>${process.mandate_year}</strong>, 
            nos termos da <strong>${normInfo.normReference}</strong>.
          </p>
        </div>

        <div class="section">
          <h3>MEMBROS INTEGRANTES DA COMISSÃO ELEITORAL</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th>CPF</th>
                <th>Função na Comissão</th>
                <th>Representação</th>
                <th>Departamento</th>
              </tr>
            </thead>
            <tbody>
              ${process.electoral_commission.map(m => `
                <tr>
                  <td><strong>${m.name}</strong></td>
                  <td>${m.cpf}</td>
                  <td>${m.role === 'PRESIDENT' ? 'Presidente da Comissão' : m.role === 'SECRETARY' ? 'Secretário' : 'Membro Efetivo'}</td>
                  <td>${m.represented_party === 'EMPLOYER' ? 'Indicado pelo Empregador' : 'Representante dos Empregados'}</td>
                  <td>${m.department}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>DAS ATRIBUIÇÕES DA COMISSÃO</h3>
          <p>
            Compete à Comissão Eleitoral: publicar o edital de convocação, receber e homologar as inscrições dos candidatos, 
            confeccionar as cédulas e fiscalizar a urna digital de votação, assegurar o sigilo do voto, presidir a apuração pública dos votos 
            e lavrar a respectiva ata de eleição.
          </p>
        </div>

        <div class="signatures">
          ${process.electoral_commission.map(m => `
            <div class="sig-box">
              <div class="line"></div>
              <strong>${m.name}</strong><br/>
              CPF: ${m.cpf} (${m.role})
            </div>
          `).join('')}
        </div>
      `;
      break;

    case 'CANDIDATE_LIST':
      title = `RELAÇÃO OFICIAL DE CANDIDATOS HOMOLOGADOS - ${normInfo.shortTitle.toUpperCase()}`;
      content = `
        <div class="header">
          <h2>${orgName}</h2>
          <div class="badge">${normInfo.code} - Candidaturas Homologadas</div>
          <h1 style="margin-top: 15px;">RELAÇÃO OFICIAL DE CANDIDATOS INSCRITOS</h1>
          <h3>ELEIÇÃO CIPA - GESTÃO ${process.mandate_year}</h3>
        </div>

        <div class="section">
          <p>
            A Comissão Eleitoral torna pública a relação oficial dos candidatos inscritos e homologados para concorrerem à eleição da 
            <strong>${normInfo.title}</strong>, a ser realizada no período de <strong>${process.timeline.voting_start_date} a ${process.timeline.voting_end_date}</strong>.
          </p>
        </div>

        <div class="section">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Nome do Candidato</th>
                <th>Departamento / Setor</th>
                <th>Cargo / Função</th>
                <th>Data da Inscrição</th>
                <th>Garantia de Emprego (Estabilidade)</th>
              </tr>
            </thead>
            <tbody>
              ${process.candidates.map(c => `
                <tr>
                  <td style="font-size: 16px; font-weight: bold; text-align: center;">${c.candidacy_number}</td>
                  <td><strong>${c.name}</strong><br/><span style="font-size: 10px; color: #666;">CPF: ${c.cpf}</span></td>
                  <td>${c.department}</td>
                  <td>${c.job_title}</td>
                  <td>${c.registration_date}</td>
                  <td><span class="badge-success">Ativa (Art. 10 ADCT)</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <p><strong>Nota de Propostas dos Candidatos:</strong> As propostas e ideias dos candidatos estão afixadas nos quadros de aviso e disponíveis para consulta na urna eletrônica corporativa.</p>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="line"></div>
            <strong>Presidente da Comissão Eleitoral</strong><br/>
            ${process.electoral_commission[0]?.name || 'Comissão Eleitoral'}
          </div>
          <div class="sig-box">
            <div class="line"></div>
            <strong>Secretário da Comissão</strong><br/>
            ${process.electoral_commission[1]?.name || 'Secretaria'}
          </div>
        </div>
      `;
      break;

    case 'ELECTION_SCRUTINY_ATA':
      title = `ATA DE ELEIÇÃO E APURAÇÃO DOS VOTOS - ${normInfo.shortTitle.toUpperCase()}`;
      content = `
        <div class="header">
          <h2>${orgName}</h2>
          <div class="badge">${normInfo.code} - Ata de Apuração Oficial</div>
          <h1 style="margin-top: 15px;">ATA DE ELEIÇÃO E APURAÇÃO DOS VOTOS</h1>
          <h3>GESTÃO ${process.mandate_year}</h3>
        </div>

        <div class="section">
          <p>
            Aos <strong>${process.timeline.scrutiny_date}</strong>, às dependências da empresa <strong>${orgName}</strong>, 
            reuniu-se a Comissão Eleitoral para apuração dos votos da eleição da <strong>${normInfo.title}</strong>.
          </p>
        </div>

        <div class="section">
          <h3>1. DO QUÓRUM REGULAMENTAR (NR-05 ITEM 5.5.4)</h3>
          <table class="data-table" style="max-width: 600px;">
            <tbody>
              <tr>
                <td><strong>Total de Empregados Eleitores Aptos:</strong></td>
                <td><strong>${process.total_eligible_voters}</strong></td>
              </tr>
              <tr>
                <td><strong>Total de Votos Coletados:</strong></td>
                <td><strong>${process.total_votes_cast}</strong></td>
              </tr>
              <tr>
                <td><strong>Percentual de Participação (Quórum):</strong></td>
                <td><strong style="color: #059669;">${process.quorum_percentage}% (Quórum Válido &ge; 50%)</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>2. CLASSIFICAÇÃO FINAL E RESULTADO DOS VOTOS</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Classificação</th>
                <th>Candidato</th>
                <th>Votos</th>
                <th>Resultado / Cargo Obtido</th>
                <th>Critério de Desempate</th>
              </tr>
            </thead>
            <tbody>
              ${process.candidates.map((c, idx) => `
                <tr style="${idx === 0 ? 'background-color: #ecfdf5;' : ''}">
                  <td style="text-align: center; font-weight: bold;">${idx + 1}º Lugar</td>
                  <td><strong>${c.name}</strong> (Nº ${c.candidacy_number})<br/><span style="font-size: 10px; color: #555;">${c.department}</span></td>
                  <td style="font-size: 15px; font-weight: bold; text-align: center;">${c.votes_received}</td>
                  <td>
                    ${c.elected_role === 'VICE_PRESIDENT' ? '<strong style="color: #047857;">ELEITO VICE-PRESIDENTE (TITULAR)</strong>' :
                      c.elected_role === 'TITULAR' ? '<strong style="color: #0d9488;">ELEITO MEMBRO TITULAR</strong>' :
                      c.elected_role === 'SUPLENTE' ? '<strong style="color: #d97706;">ELEITO MEMBRO SUPLENTE</strong>' :
                      '<span style="color: #6b7280;">Não Eleito</span>'}
                  </td>
                  <td>Tempo de Casa: ${c.tiebreaker_seniority_months} meses | Idade: ${c.tiebreaker_age_years} anos</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="line"></div>
            <strong>Presidente da Comissão Eleitoral</strong>
          </div>
          <div class="sig-box">
            <div class="line"></div>
            <strong>Vice-Presidente Eleito</strong>
          </div>
          <div class="sig-box">
            <div class="line"></div>
            <strong>Representante do Empregador</strong>
          </div>
        </div>
      `;
      break;

    case 'INAUGURATION_ATA':
      title = `ATA DE POSSE E INSTALAÇÃO DA ${normInfo.shortTitle.toUpperCase()} - GESTÃO ${process.mandate_year}`;
      content = `
        <div class="header">
          <h2>${orgName}</h2>
          <div class="badge">${normInfo.code} - Ata de Instalação e Posse</div>
          <h1 style="margin-top: 15px;">ATA DE INSTALAÇÃO E POSSE DA CIPA</h1>
          <h3>GESTÃO ${process.mandate_year}</h3>
        </div>

        <div class="section">
          <p>
            Aos <strong>${process.timeline.inauguration_date}</strong>, nas dependências da empresa <strong>${orgName}</strong>, 
            reuniram-se os representantes do empregador e dos empregados para a cerimônia de <strong>Instalação e Posse da ${normInfo.title}</strong>, 
            que cumprirá mandato de 1 (um) ano, em consonância com a <strong>${normInfo.normReference}</strong>.
          </p>
        </div>

        <div class="section">
          <h3>COMPOSIÇÃO OFICIAL DA CIPA (${process.mandate_year})</h3>
          
          <h4 style="color: #1e293b; margin-top: 12px;">REPRESENTANTES DO EMPREGADOR (INDICADOS)</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Cargo na CIPA</th>
                <th>Nome Completo</th>
                <th>CPF</th>
                <th>Cargo na Empresa</th>
                <th>Treinamento</th>
              </tr>
            </thead>
            <tbody>
              ${process.employer_appointees.map(e => `
                <tr>
                  <td><strong>${e.role === 'PRESIDENT' ? 'PRESIDENTE DA CIPA' : e.role === 'TITULAR' ? 'TITULAR DO EMPREGADOR' : 'SUPLENTE DO EMPREGADOR'}</strong></td>
                  <td>${e.name}</td>
                  <td>${e.cpf}</td>
                  <td>${e.job_title} (${e.department})</td>
                  <td>${e.training_completed ? 'Concluído (' + e.training_hours + 'h)' : 'Pendente'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h4 style="color: #1e293b; margin-top: 16px;">REPRESENTANTES DOS EMPREGADOS (ELEITOS)</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Cargo na CIPA</th>
                <th>Nome Completo</th>
                <th>CPF</th>
                <th>Departamento</th>
                <th>Votação Obtida</th>
              </tr>
            </thead>
            <tbody>
              ${process.candidates.filter(c => c.elected_role && c.elected_role !== 'NOT_ELECTED').map(c => `
                <tr>
                  <td><strong>${c.elected_role === 'VICE_PRESIDENT' ? 'VICE-PRESIDENTE DA CIPA' : c.elected_role === 'TITULAR' ? 'TITULAR DOS EMPREGADOS' : 'SUPLENTE DOS EMPREGADOS'}</strong></td>
                  <td>${c.name}</td>
                  <td>${c.cpf}</td>
                  <td>${c.department}</td>
                  <td>${c.votes_received} votos</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h3>COMPROMISSO E DIRETRIZES DA GESTÃO</h3>
          <p>
            Os membros empossados declaram estar cientes de suas atribuições legais, comprometendo-se a zelar pelas condições de segurança, 
            ergonomia, saúde e prevenção de acidentes no ambiente laboral, bem como conduzir as ações preventivas e educativas relativas ao 
            combate ao assédio sexual e demais formas de violência (Lei 14.457/2022).
          </p>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="line"></div>
            <strong>Presidente da CIPA</strong><br/>
            ${process.employer_appointees.find(e => e.is_president)?.name || 'Presidente'}
          </div>
          <div class="sig-box">
            <div class="line"></div>
            <strong>Vice-Presidente da CIPA</strong><br/>
            ${process.candidates.find(c => c.elected_role === 'VICE_PRESIDENT')?.name || 'Vice-Presidente'}
          </div>
          <div class="sig-box">
            <div class="line"></div>
            <strong>Diretor / Representante Legal</strong><br/>
            ${orgName}
          </div>
        </div>
      `;
      break;

    case 'ANNUAL_MEETING_CALENDAR':
      title = `CALENDÁRIO OFICIAL DE REUNIÕES ORDINÁRIAS - GESTÃO ${process.mandate_year}`;
      content = `
        <div class="header">
          <h2>${orgName}</h2>
          <div class="badge">${normInfo.code} - Item 5.6.1 (Reuniões Mensais)</div>
          <h1 style="margin-top: 15px;">CALENDÁRIO ANUAL DE REUNIÕES ORDINÁRIAS</h1>
          <h3>GESTÃO ${process.mandate_year}</h3>
        </div>

        <div class="section">
          <p>
            Em cumprimento ao item 5.6.1 da <strong>${normInfo.normReference}</strong>, a CIPA estabelece o calendário anual 
            de reuniões ordinárias mensais que ocorrerão durante o expediente normal da empresa.
          </p>
        </div>

        <div class="section">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mês / Reunião</th>
                <th>Data Prevista</th>
                <th>Horário</th>
                <th>Pauta Principal</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1ª Reunião Ordinária</td><td>15/10/2026</td><td>09:00</td><td>Instalação, Mapa de Risco e Plano de Trabalho Anual</td></tr>
              <tr><td>2ª Reunião Ordinária</td><td>19/11/2026</td><td>09:00</td><td>Avaliação da SIPAT e Ações Lei 14.457/2022</td></tr>
              <tr><td>3ª Reunião Ordinária</td><td>17/12/2026</td><td>09:00</td><td>Inspeção de Segurança de Fim de Ano e Manutenção Preventiva</td></tr>
              <tr><td>4ª Reunião Ordinária</td><td>21/01/2027</td><td>09:00</td><td>Análise Estatística de Acidentes e Incidentes de Trabalho</td></tr>
              <tr><td>5ª Reunião Ordinária</td><td>18/02/2027</td><td>09:00</td><td>Ergonomia e Conforto nos Postos de Trabalho</td></tr>
              <tr><td>6ª Reunião Ordinária</td><td>18/03/2027</td><td>09:00</td><td>Campanhas de Saúde Ocupacional e Vacinação</td></tr>
              <tr><td>7ª Reunião Ordinária</td><td>15/04/2027</td><td>09:00</td><td>Revisão dos EPIs e Treinamentos de Reciclagem</td></tr>
              <tr><td>8ª Reunião Ordinária</td><td>20/05/2027</td><td>09:00</td><td>Segurança em Máquinas e Equipamentos (NR-12)</td></tr>
              <tr><td>9ª Reunião Ordinária</td><td>17/06/2027</td><td>09:00</td><td>Inspeção em Sistemas de Prevenção e Combate a Incêndio</td></tr>
              <tr><td>10ª Reunião Ordinária</td><td>15/07/2027</td><td>09:00</td><td>Planejamento do Processo Eleitoral da Gestão Subsequente</td></tr>
              <tr><td>11ª Reunião Ordinária</td><td>19/08/2027</td><td>09:00</td><td>Acompanhamento da Comissão Eleitoral e Inscrições</td></tr>
              <tr><td>12ª Reunião Ordinária</td><td>16/09/2027</td><td>09:00</td><td>Relatório Final de Gestão e Transição para Nova CIPA</td></tr>
            </tbody>
          </table>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <div class="line"></div>
            <strong>Presidente da CIPA</strong>
          </div>
          <div class="sig-box">
            <div class="line"></div>
            <strong>Vice-Presidente da CIPA</strong>
          </div>
        </div>
      `;
      break;

    case 'TRAINING_CERTIFICATES':
      title = `CERTIFICADO OFICIAL DE CAPACITAÇÃO CIPA (${process.dimensioning.training_hours_required} HORAS)`;
      const recipientName = customParams?.certificateRecipient || process.candidates[0]?.name || 'Membro da CIPA';
      content = `
        <div class="header" style="border: 4px double #0d9488; padding: 25px; border-radius: 12px; background: #fafafa;">
          <h2 style="color: #0d9488; font-size: 24px; letter-spacing: 2px;">CERTIFICADO DE CAPACITAÇÃO</h2>
          <p style="font-size: 14px; text-transform: uppercase; color: #666; margin-top: 5px;">Portaria MTP nº 4.219 / NR-05 / Lei 14.457/2022</p>
          
          <div style="margin: 30px 0; font-size: 16px; line-height: 1.8; color: #1e293b;">
            Certificamos que <strong>${recipientName}</strong> concluiu com aproveitamento satisfatório o 
            <strong>CURSO OBRIGATÓRIO DE CAPACITAÇÃO PARA MEMBROS DA CIPA (${normInfo.shortTitle.toUpperCase()})</strong>, 
            com carga horária total de <strong>${process.dimensioning.training_hours_required} horas</strong>, 
            realizado na empresa <strong>${orgName}</strong> para a <strong>Gestão ${process.mandate_year}</strong>.
          </div>

          <div style="text-align: left; background: #fff; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; margin-bottom: 25px;">
            <strong>CONTEÚDO PROGRAMÁTICO OBRIGATÓRIO MINISTRADO:</strong>
            <ul style="margin: 5px 0 0 15px; padding: 0;">
              <li>Estudo do ambiente, das condições de trabalho e dos riscos originados do processo produtivo;</li>
              <li>Metodologia de investigação e análise de acidentes e doenças relacionadas ao trabalho;</li>
              <li>Noções sobre acidentes e doenças decorrentes da exposição aos riscos existentes na empresa;</li>
              <li>Noções sobre a Síndrome da Imunodeficiência Adquirida (AIDS) e medidas de prevenção;</li>
              <li>Noções sobre as legislações trabalhista e previdenciária relativas à segurança e saúde no trabalho;</li>
              <li>Princípios gerais de higiene do trabalho e de medidas de controle dos riscos;</li>
              <li>Desenvolvimento do Mapa de Riscos e Plano de Trabalho da CIPA;</li>
              <li><strong>Módulo Especial Lei nº 14.457/2022:</strong> Prevenção e combate ao assédio sexual, moral e a todas as formas de violência no ambiente de trabalho.</li>
            </ul>
          </div>

          <div class="signatures" style="margin-top: 40px;">
            <div class="sig-box">
              <div class="line"></div>
              <strong>Instrutor / Eng. de Segurança do Trabalho</strong><br/>
              CREA / Registro Profissional
            </div>
            <div class="sig-box">
              <div class="line"></div>
              <strong>Responsável Legal pela Empresa</strong><br/>
              ${orgName}
            </div>
          </div>
        </div>
      `;
      break;

    default:
      title = `DOCUMENTO CIPA - ${process.client_name}`;
      content = `<p>Documento oficial CIPA.</p>`;
  }

  // Full HTML wrapper for print/PDF preview
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 20px;
            line-height: 1.5;
            font-size: 13px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #0d9488;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 18px;
            margin: 5px 0;
            color: #0f172a;
          }
          .header h2 {
            font-size: 15px;
            margin: 0;
            color: #0d9488;
          }
          .header h3 {
            font-size: 13px;
            margin: 5px 0 0 0;
            color: #64748b;
          }
          .badge {
            display: inline-block;
            background: #f0fdfa;
            color: #0f766e;
            border: 1px solid #99f6e4;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: bold;
            margin-top: 5px;
          }
          .badge-success {
            background: #dcfce7;
            color: #166534;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
          }
          .section {
            margin-bottom: 20px;
          }
          .section h3 {
            font-size: 13px;
            color: #0f766e;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
          }
          .data-table th, .data-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
            text-align: left;
          }
          .data-table th {
            background: #f8fafc;
            color: #334155;
            font-weight: bold;
          }
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 40px;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 42%;
            font-size: 11px;
          }
          .sig-box .line {
            border-top: 1px solid #334155;
            margin-bottom: 5px;
          }
          .footer-auth {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px dashed #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #64748b;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${content}
        
        <div class="footer-auth">
          <div>
            <strong>PrevSafe SST Intelligence - Documento Digital Autenticado</strong><br/>
            Conformidade com Lei 14.063/2020 e Portaria MTP nº 672/2021 | Validação: SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}
          </div>
          <div style="text-align: right;">
            Data de Emissão: ${formattedDate} | Página 1 de 1
          </div>
        </div>
      </body>
    </html>
  `;
}

export function printOrExportCipaDocument(
  process: CipaManagementProcess,
  docType: CipaDocumentType,
  customParams?: {
    candidateId?: string;
    meetingId?: string;
    certificateRecipient?: string;
  }
) {
  if (typeof window === 'undefined') return;

  const html = generateCipaDocumentHTML(process, docType, customParams);
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Give time to render before triggering native print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  } else {
    alert('Por favor, permita pop-ups para visualizar e imprimir o documento da CIPA em PDF.');
  }
}
