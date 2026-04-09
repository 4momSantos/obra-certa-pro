CREATE POLICY "delete_config_auth" ON ppu_items FOR DELETE TO authenticated USING (true);
CREATE POLICY "delete_config_auth" ON classificacao_ppu FOR DELETE TO authenticated USING (true);
CREATE POLICY "delete_config_auth" ON eac_items FOR DELETE TO authenticated USING (true);
CREATE POLICY "delete_config_auth" ON criterio_medicao FOR DELETE TO authenticated USING (true);