const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyRlsChanges() {
  // Configurar cliente Supabase com service role key
  const supabaseUrl = 'https://zysejmuapexkkuhwkuql.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5c2VqbXVhcGV4a2t1aHdrdXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzkxOTA1OCwiZXhwIjoyMDYzNDk1MDU4fQ.PFqHVOmnAyCaCt7ZHDbyjgfPRj_a0swb9qt89_vcrdA';
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔄 Iniciando aplicação das mudanças de RLS...');
    
    // Testar acesso à tabela company_users
    console.log('\n📋 Testando acesso à tabela company_users...');
    const { data: users, error: usersError } = await supabase
      .from('company_users')
      .select('id, user_id, company_id, role')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Erro ao acessar company_users:', usersError);
      return;
    } else {
      console.log(`✅ Acesso à tabela company_users funcionando! (${users.length} registros encontrados)`);
    }
    
    // Tentar executar o script SQL
    const sqlFile = process.argv[2];
    if (sqlFile && fs.existsSync(sqlFile)) {
      console.log(`\n📝 Executando script SQL: ${sqlFile}`);
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      
      // Executar o SQL usando a função rpc
      console.log('\n🔄 Aplicando mudanças de RLS...');
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
      
      if (error) {
        console.error('❌ Erro ao executar SQL:', error);
        console.log('\n📝 Para aplicar as mudanças manualmente:');
        console.log('1. Acesse: https://supabase.com/dashboard/project/zysejmuapexkkuhwkuql');
        console.log('2. Vá em "SQL Editor"');
        console.log(`3. Execute o conteúdo do arquivo: ${sqlFile}`);
      } else {
        console.log('✅ Script SQL executado com sucesso!');
        console.log('✨ Políticas RLS simplificadas! O problema de tela branca deve estar resolvido.');
      }
    } else {
      console.log('\n📝 Para aplicar as mudanças de RLS, você precisa:');
      console.log('\n1. Acessar o painel do Supabase: https://supabase.com/dashboard/project/zysejmuapexkkuhwkuql');
      console.log('2. Ir em "SQL Editor"');
      console.log('3. Copiar e colar o conteúdo do arquivo: sql/01_fase1_simplificacao_rls.sql');
      console.log('4. Executar o script');
      
      console.log('\n🔧 Alternativamente, você pode:');
      console.log('- Instalar o PostgreSQL client (psql)');
      console.log('- Ou usar o Supabase CLI');
      console.log('- Ou executar o script através de outro cliente PostgreSQL');
      
      console.log('\n✨ Após executar o script SQL, as políticas RLS serão simplificadas e o problema de tela branca deve ser resolvido!');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o processo:', error);
  }
}

applyRlsChanges();