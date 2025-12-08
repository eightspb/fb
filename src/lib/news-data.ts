export interface NewsItem {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  date: string;
  year: string;
  images?: string[];
  videos?: string[];
  documents?: string[];
  tags?: string[];
  author?: string;
  location?: string;
  category?: string;
  status?: string;
}

// Training images mapping - generated from /public/images/trainings folders
const trainingImagesMap: Record<string, string[]> = {
  "06.11.2025": [
    "/images/trainings/2025.11.06/image_1762451338150_0.jpg",
    "/images/trainings/2025.11.06/image_1762451338897_1.jpg",
    "/images/trainings/2025.11.06/image_1762451999963_0.jpg",
    "/images/trainings/2025.11.06/image_1762452000696_1.jpg",
    "/images/trainings/2025.11.06/image_1762452281836_0.jpg",
    "/images/trainings/2025.11.06/image_1762452460282_0.jpg",
    "/images/trainings/2025.11.06/image_1762452620929_0.jpg",
    "/images/trainings/2025.11.06/image_1762454056898_1.jpg",
    "/images/trainings/2025.11.06/image_1762454058568_0.jpg",
    "/images/trainings/2025.11.06/image_1762454972639_0.jpg",
    "/images/trainings/2025.11.06/image_1762455346834_0.jpg",
    "/images/trainings/2025.11.06/image_1762455594740_0.jpg"
  ],
  "05.11.2025": [
  ],
  "14.10.2025": [
    "/images/trainings/2025.10.14/36993e88-885d-41b4-88f0-33992a51f93d.jpg",
    "/images/trainings/2025.10.14/42219b6c-d29b-4586-adbd-a1f0aeccac59.jpg",
    "/images/trainings/2025.10.14/8039bf26-4c0a-4c38-aa3b-b93e6a72df40.jpg",
    "/images/trainings/2025.10.14/a087b88d-cc84-4d9f-90f3-04360aa2f91e.jpg",
    "/images/trainings/2025.10.14/b8b19722-5aa3-4807-a479-f7bc757fd7fb.jpg",
    "/images/trainings/2025.10.14/d086217b-cc14-4aa3-b335-a7ca19dcbabd.jpg",
    "/images/trainings/2025.10.14/IMG_9741.jpg",
    "/images/trainings/2025.10.14/IMG_9746.jpg",
    "/images/trainings/2025.10.14/IMG_9748.jpg",
    "/images/trainings/2025.10.14/IMG_9750.MOV",
    "/images/trainings/2025.10.14/IMG_9782.jpg",
    "/images/trainings/2025.10.14/IMG_9784.jpg",
    "/images/trainings/2025.10.14/IMG_9786.jpg",
    "/images/trainings/2025.10.14/IMG_9787.jpg"
  ],
  "11.08.2025": [
    "/images/trainings/2025.08.11/269471b2-953b-4592-93b3-90ba63838822.jpg",
    "/images/trainings/2025.08.11/IMG_8594.jpg",
    "/images/trainings/2025.08.11/IMG_8653.jpg",
    "/images/trainings/2025.08.11/IMG_8656.jpg",
    "/images/trainings/2025.08.11/IMG_8664.jpg",
    "/images/trainings/2025.08.11/IMG_8668.jpg",
    "/images/trainings/2025.08.11/IMG_8694.jpg"
  ],
  "07.07.2025": [
    "/images/trainings/2025.07.07/IMG_7972.jpg",
    "/images/trainings/2025.07.07/IMG_7984.jpg"
  ],
  "12.06.2025": [
    "/images/trainings/2025.06.12/IMG_7277.jpg",
    "/images/trainings/2025.06.12/IMG_7280.jpg",
    "/images/trainings/2025.06.12/IMG_7283.jpg",
    "/images/trainings/2025.06.12/IMG_7291.jpg"
  ],
  "11.06.2025": [
    "/images/trainings/2025.06.11/IMG_7268.jpg"
  ],
  "10.06.2025": [
    "/images/trainings/2025.06.10/364ac0d6-4a54-4615-9199-51c413cff220.jpg"
  ],
  "09.06.2025": [
    "/images/trainings/2025.06.09/IMG_7253.jpg",
    "/images/trainings/2025.06.09/IMG_7257.jpg",
    "/images/trainings/2025.06.09/IMG_7262.jpg",
    "/images/trainings/2025.06.09/IMG_7269.jpg",
    "/images/trainings/2025.06.09/IMG_7284.jpg",
    "/images/trainings/2025.06.09/IMG_7296.jpg"
  ],
  "14.05.2025": [
    "/images/trainings/2025.05.14/IMG_6652.jpg"
  ],
  "13.05.2025": [
    "/images/trainings/2025.05.13/IMG_6641.jpg",
    "/images/trainings/2025.05.13/IMG_6644.jpg"
  ],
  "12.05.2025": [
    "/images/trainings/2025.05.12/IMG_6639.jpg",
    "/images/trainings/2025.05.12/IMG_6655.jpg",
    "/images/trainings/2025.05.12/IMG_6679.jpg",
    "/images/trainings/2025.05.12/IMG_6680.jpg",
    "/images/trainings/2025.05.12/IMG_6686.jpg",
    "/images/trainings/2025.05.12/IMG_7214.jpg"
  ],
  "26.04.2025": [
    "/images/trainings/2025.04.26/00066628-06ce-4381-baba-6b009e35e433.JPG",
    "/images/trainings/2025.04.26/4591c410-3224-43d4-b8e3-14c5532646c0.JPG",
    "/images/trainings/2025.04.26/c8f969da-f5c2-4fd0-b37a-5672cc6b27e4.JPG",
    "/images/trainings/2025.04.26/IMG_6175.jpg",
    "/images/trainings/2025.04.26/IMG_6177.jpg",
    "/images/trainings/2025.04.26/IMG_6180.jpg",
    "/images/trainings/2025.04.26/IMG_6184.jpg"
  ],
  "23.04.2025": [
    "/images/trainings/2025.04.23/IMG_6101.jpg",
    "/images/trainings/2025.04.23/IMG_6104.jpg"
  ],
  "22.04.2025": [
    "/images/trainings/2025.04.22/IMG_6091.jpg"
  ],
  "10.04.2025": [
    "/images/trainings/2025.04.10/IMG_5839.jpg"
  ],
  "09.04.2025": [
    "/images/trainings/2025.04.09/IMG_5806.jpg"
  ],
  "08.04.2025": [
    "/images/trainings/2025.04.08/IMG_5783.jpg",
    "/images/trainings/2025.04.08/IMG_5784.jpg",
    "/images/trainings/2025.04.08/IMG_5790.jpg",
    "/images/trainings/2025.04.08/IMG_5795.jpg"
  ],
  "07.04.2025": [
    "/images/trainings/2025.04.07/963e980a-8190-4dc9-902d-98b4d1e41083.jpg",
    "/images/trainings/2025.04.07/IMG_5786.jpg",
    "/images/trainings/2025.04.07/IMG_5787.jpg",
    "/images/trainings/2025.04.07/IMG_5810.jpg",
    "/images/trainings/2025.04.07/IMG_5828.jpg",
    "/images/trainings/2025.04.07/IMG_5830.jpg",
    "/images/trainings/2025.04.07/IMG_5834.jpg",
    "/images/trainings/2025.04.07/IMG_5837.jpg"
  ],
  "13.03.2025": [
    "/images/trainings/2025.03.13/IMG_5260.jpg"
  ],
  "12.03.2025": [
    "/images/trainings/2025.03.12/IMG_5255.jpg"
  ],
  "03.03.2025": [
    "/images/trainings/2025.03.03/IMG_5103.jpg",
    "/images/trainings/2025.03.03/IMG_5110.jpg"
  ],
  "13.02.2025": [
    "/images/trainings/2025.02.13/IMG_4543.jpg",
    "/images/trainings/2025.02.13/IMG_4549.jpg",
    "/images/trainings/2025.02.13/IMG_4550.jpg"
  ],
  "12.02.2025": [
    "/images/trainings/2025.02.12/IMG_4457.jpg",
    "/images/trainings/2025.02.12/IMG_4461.jpg",
    "/images/trainings/2025.02.12/IMG_4463.jpg",
    "/images/trainings/2025.02.12/IMG_4472.jpg",
    "/images/trainings/2025.02.12/IMG_4479.jpg"
  ],
  "10.02.2025": [
    "/images/trainings/2025.02.10/4d58413c-9af3-4856-a197-73fbb36762b0.JPG",
    "/images/trainings/2025.02.10/IMG_4452.jpg",
    "/images/trainings/2025.02.10/IMG_4453.jpg",
    "/images/trainings/2025.02.10/IMG_4460.jpg",
    "/images/trainings/2025.02.10/IMG_4462.jpg",
    "/images/trainings/2025.02.10/IMG_4467.jpg",
    "/images/trainings/2025.02.10/IMG_4483.jpg",
    "/images/trainings/2025.02.10/IMG_4490.jpg",
    "/images/trainings/2025.02.10/IMG_4533.jpg",
    "/images/trainings/2025.02.10/IMG_4535.jpg",
    "/images/trainings/2025.02.10/IMG_4556.jpg",
    "/images/trainings/2025.02.10/IMG_4565.jpg",
    "/images/trainings/2025.02.10/IMG_4566.jpg"
  ],
  "31.01.2025": [
    "/images/trainings/2025.01.31/31cfb08b-239b-45c3-ad05-d5f073345073.JPG",
    "/images/trainings/2025.01.31/3ef41f05-85af-4cd3-838a-004b2c4aca09.jpg",
    "/images/trainings/2025.01.31/5b5ab685-f0a3-40fb-a561-0d2fad5468e5.jpg",
    "/images/trainings/2025.01.31/754a6f2e-9a27-436c-ba49-38245ea54725.jpg",
    "/images/trainings/2025.01.31/a33bbd11-07df-4600-b585-102fb9927ea4.JPG"
  ],
  "18.11.2024": [
    "/images/trainings/2024.11.18/11702402-C388-4243-9695-04B3D5081974.jpeg",
    "/images/trainings/2024.11.18/2D30B396-142C-4255-BD0A-64789A8E4C98.jpeg",
    "/images/trainings/2024.11.18/469AB64E-8E8E-4EA2-A657-0D8A5525F5C1.jpeg",
    "/images/trainings/2024.11.18/5650CACB-88AE-4E6D-BDF6-3C2CB882857B.jpeg",
    "/images/trainings/2024.11.18/66CFE1A9-1F7E-4C30-A1C2-41D546814A1B.jpeg",
    "/images/trainings/2024.11.18/6A720381-F084-44AB-ACC4-C72C9382DD75.jpeg",
    "/images/trainings/2024.11.18/6C08766B-F3D8-4CC6-96AD-6240C901D45E.jpeg",
    "/images/trainings/2024.11.18/6C758A53-317B-4B4A-AE4A-650A5949E5E2.jpeg",
    "/images/trainings/2024.11.18/7BF16002-75F5-426D-8E19-265AA14CCBF7.jpeg",
    "/images/trainings/2024.11.18/85DFAC19-8237-42A3-A231-61D32E56B18D.jpeg",
    "/images/trainings/2024.11.18/DA75BDCD-E82E-492F-9B8D-B128C89ABE29.jpeg"
  ],
  "30.09.2024": [
    "/images/trainings/2024.09.30/1C80F326-9738-4801-BEE1-5156315F4724.jpeg",
    "/images/trainings/2024.09.30/5459757C-3C4D-4D19-A89F-8B8BFC9D592F.jpeg",
    "/images/trainings/2024.09.30/612DE37A-C5FA-4BAB-882E-4276B0BC66DD.jpeg",
    "/images/trainings/2024.09.30/A225C3AB-17BC-49A4-923C-3C836B6D9E3D.jpeg",
    "/images/trainings/2024.09.30/D62787C6-BD84-4420-A583-70F5CAF4B862.jpeg",
    "/images/trainings/2024.09.30/E8ECD8B0-F197-469D-88F4-49F1410FA481.jpeg"
  ],
  "21.09.2024": [
    "/images/trainings/2024.09.21/08B5B819-0631-48F9-A3F7-1B520B2C8378.jpeg",
    "/images/trainings/2024.09.21/193F08DA-6B1D-4B7D-AF6F-B129A4345E2D.jpeg",
    "/images/trainings/2024.09.21/550CE6B1-9B2B-4C1A-AF9E-369C5043F38C.jpeg",
    "/images/trainings/2024.09.21/635BEE6E-CC46-4834-B7FC-FAB6E031FCDC.jpeg",
    "/images/trainings/2024.09.21/6AFA88BF-2A71-418A-A279-78143C515514.jpeg",
    "/images/trainings/2024.09.21/8CF4F926-C140-4562-82D6-E2D7DA0ACC04.jpeg",
    "/images/trainings/2024.09.21/E0707633-4409-4A47-9E23-0C5C8D2D80A1.jpeg"
  ],
  "17.09.2024": [
    "/images/trainings/2024.09.17/0DACC7A4-9437-4687-8F32-8E673690D03B.jpeg",
    "/images/trainings/2024.09.17/1E428FFA-0BDA-4A82-B74D-D29C91052954.jpeg",
    "/images/trainings/2024.09.17/8EF4083D-3A1A-45FB-951D-5E41037C5876.jpeg",
    "/images/trainings/2024.09.17/CCF58B9E-5FAD-48C5-9042-61F2D7880BC9.jpeg"
  ],
  "12.08.2024": [
    "/images/trainings/2024.08.12/37580301-EDD0-4C28-ABF1-154C40130804.jpeg",
    "/images/trainings/2024.08.12/9EDCDBB2-0ACF-445D-B3B0-A38A7BED3D37.jpeg",
    "/images/trainings/2024.08.12/A2E28DEB-F86B-420C-8FB6-8C72D1BE966D.jpeg",
    "/images/trainings/2024.08.12/B9D7B3D0-8A2A-4502-81E5-7E17BB027AB9.jpeg",
    "/images/trainings/2024.08.12/DF71F295-CE93-4BE1-9A6C-B9E964E5EF7B.jpeg"
  ],
  "15.07.2024": [
    "/images/trainings/2024.07.15/6FAC2404-C504-444F-987C-010DC0CCD8FA.jpeg",
    "/images/trainings/2024.07.15/78F97D21-D9E8-4958-BFCC-E1D64B8FB075.jpeg",
    "/images/trainings/2024.07.15/9C650D22-8E41-42B6-8A4C-C07842EA6F07.jpeg",
    "/images/trainings/2024.07.15/A9C2613C-E115-4EC7-BA7A-60D26A5A9330.jpeg",
    "/images/trainings/2024.07.15/C1299573-28D3-41C5-835B-CB89F1C43E9F.jpeg",
    "/images/trainings/2024.07.15/C5471252-8653-4A1D-85CE-42A03FA44117.jpeg"
  ],
  "17.06.2024": [
    "/images/trainings/2024.06.17/0CA9DC9A-D7C7-4652-A425-BCC6EC890ADD.jpeg",
    "/images/trainings/2024.06.17/2032EE76-84CF-404C-BF09-C879C24CBB3F.jpeg",
    "/images/trainings/2024.06.17/2AFD54F8-451D-4613-99AE-60DFC010A32D.jpeg",
    "/images/trainings/2024.06.17/526E7C35-E4AC-4B0C-BCB1-76A2FEF9F66B.jpeg",
    "/images/trainings/2024.06.17/52B62748-6543-449B-B68F-53A48ECE41FE.jpeg",
    "/images/trainings/2024.06.17/648C10FA-24A3-4CB0-83BD-761F866E4425.jpeg",
    "/images/trainings/2024.06.17/AEB8E92A-3CA8-45C7-A848-8147AD3FB473.jpeg",
    "/images/trainings/2024.06.17/C91C8EC4-67D9-49D2-9291-35D5034F7976.jpeg",
    "/images/trainings/2024.06.17/DA87B964-69C0-416F-AFFC-B62BAA6A5053.jpeg",
    "/images/trainings/2024.06.17/F70D18AF-773D-442D-AE03-6BE9502B0478.jpeg"
  ],
  "15.03.2024": [
    "/images/trainings/2024.03.15/C8615A8F-2C51-4CCB-9046-EBD39B6E62A9.jpeg"
  ],
  "12.03.2024": [
    "/images/trainings/2024.03.12/076AE63B-1F98-4281-83DF-A617DEDB5C11.jpeg",
    "/images/trainings/2024.03.12/0BAB9E3A-78CF-4104-B12A-805CDF87A321.jpeg",
    "/images/trainings/2024.03.12/16BEAEA1-D83D-41F6-871C-F4B35440A59C.jpeg",
    "/images/trainings/2024.03.12/1FD52E4E-6696-41F6-A7DC-58C00A70BF94.jpeg",
    "/images/trainings/2024.03.12/24A99C3C-3C7A-4820-98C9-5E0F641D5EFF.jpeg",
    "/images/trainings/2024.03.12/2CB26D56-CB8E-4C43-A9C7-D321FB0E87D9.jpeg",
    "/images/trainings/2024.03.12/2E7C68A5-BC4D-49FB-A4AA-E020340F73A2.jpeg",
    "/images/trainings/2024.03.12/35D9D55F-44DD-4106-9BB9-A73E3CFFDDEC.jpeg",
    "/images/trainings/2024.03.12/3ECE9F0C-23CB-455F-BB23-775B7C374B4B.jpeg",
    "/images/trainings/2024.03.12/40F6971A-D6A3-45F4-8A99-7114CABC0857.jpeg",
    "/images/trainings/2024.03.12/52C41CBA-B38F-4BBE-816E-024490F68E91.jpeg",
    "/images/trainings/2024.03.12/841BFD01-ED08-4E97-BF1E-56EEB733CE82.jpeg",
    "/images/trainings/2024.03.12/8DD68307-5A8A-496B-834C-85470D2C7926.jpeg",
    "/images/trainings/2024.03.12/9EAC9072-C0D9-456B-9190-05E4ECBD0A7E.jpeg",
    "/images/trainings/2024.03.12/9F95A3A5-136C-4433-9FC6-D5626DB4F7F6.jpeg",
    "/images/trainings/2024.03.12/B144B842-9BD5-470B-9FF0-CBBCD0C3B806.jpeg",
    "/images/trainings/2024.03.12/BD36FA6F-855D-46FE-ABC6-88B03B7E5D26.jpeg",
    "/images/trainings/2024.03.12/BE78B8D5-AED3-42D8-9B94-37F044294A40.jpeg",
    "/images/trainings/2024.03.12/C69432AC-2146-4958-98F9-4BE77720EDF9.jpeg",
    "/images/trainings/2024.03.12/D49F6C12-D9D8-46CC-B4A0-3BDC59DAA44D.jpeg",
    "/images/trainings/2024.03.12/E763ACD8-2DE5-41BA-BDD5-51B84D0E2CAD.jpeg",
    "/images/trainings/2024.03.12/F7603D28-2439-4FBA-BF81-35A88029CD8A.jpeg",
    "/images/trainings/2024.03.12/FFC1A766-BB59-45D9-B537-79EF0817F917.jpeg"
  ],
  "04.12.2023": [
    "/images/trainings/2023.12.04/IMG_3982.jpg",
    "/images/trainings/2023.12.04/IMG_3985.jpg",
    "/images/trainings/2023.12.04/IMG_3987.jpg",
    "/images/trainings/2023.12.04/IMG_4001.JPG"
  ],
  "18.09.2023": [
    "/images/trainings/2023.09.18/IMG_1652.jpg",
    "/images/trainings/2023.09.18/IMG_1657.jpg",
    "/images/trainings/2023.09.18/IMG_1660.jpg",
    "/images/trainings/2023.09.18/IMG_1663.jpg",
    "/images/trainings/2023.09.18/IMG_9463.JPG"
  ],
  "28.06.2023": [
    "/images/trainings/2023.06.28/IMG_9464.JPG"
  ],
  "19.06.2023": [
  ],
  "15.05.2023": [
    "/images/trainings/2023.05.15/PHOTO-2023-05-16-21-15-39 1.jpg",
    "/images/trainings/2023.05.15/PHOTO-2023-05-16-21-15-39.jpg"
  ],
  "27.04.2023": [
    "/images/trainings/2023.04.27/0f328585-9e7f-4fd0-bbe8-1df4d08a60fc.JPG",
    "/images/trainings/2023.04.27/3b655646-418c-4132-a687-73a2cbde0714.JPG",
    "/images/trainings/2023.04.27/64dd573b-da81-421b-882f-326f40167d8f.JPG"
  ],
  "12.04.2023": [
  ],
  "10.04.2023": [
  ],
  "03.04.2023": [
    "/images/trainings/2023.04.03/IMG_7792.jpg",
    "/images/trainings/2023.04.03/IMG_7814.jpg",
    "/images/trainings/2023.04.03/IMG_7819.jpg"
  ],
  "30.03.2023": [
    "/images/trainings/2023.03.30/30.03.2023 .jpg",
    "/images/trainings/2023.03.30/30.03.2023 1.jpg",
    "/images/trainings/2023.03.30/30.03.2023.jpg"
  ],
  "23.03.2023": [
    "/images/trainings/2023.03.23/IMG_7603.jpg",
    "/images/trainings/2023.03.23/IMG_7620.jpg"
  ],
  "13.03.2023": [
    "/images/trainings/2023.03.13/IMG_7502.jpg"
  ],
  "25.11.2022": [
    "/images/trainings/2022.11.25/IMG_5393.jpg"
  ],
  "14.09.2022": [
    "/images/trainings/2022.09.14/IMG_3802.jpg",
    "/images/trainings/2022.09.14/IMG_3805.jpg"
  ],
  "16.06.2022": [
    "/images/trainings/2022.06.16/4D3F7320-9CE4-4341-A2EC-68D016D791D5.jpeg",
    "/images/trainings/2022.06.16/IMG_1755.jpg",
    "/images/trainings/2022.06.16/IMG_1756.jpg"
  ],
  "05.03.2022": [
    "/images/trainings/2022.03.05/05D183BA-A855-4897-B7BF-ADED029DF3CB.jpeg",
    "/images/trainings/2022.03.05/38F0667E-EE42-4F83-8434-999E5AAA8189.jpeg",
    "/images/trainings/2022.03.05/9A707FA0-AD4F-4BC8-94E6-22D46C0D5235.jpeg"
  ],
  "19.11.2021": [
    "/images/trainings/2021.11.19/IMG_8237.jpg",
    "/images/trainings/2021.11.19/IMG_8242.jpg",
    "/images/trainings/2021.11.19/IMG_8243.jpg",
    "/images/trainings/2021.11.19/IMG_8249.jpg",
    "/images/trainings/2021.11.19/IMG_8250.jpg"
  ],
  "18.11.2021": [
    "/images/trainings/2021.11.18/IMG_8223.jpg"
  ],
  "26.08.2021": [
    "/images/trainings/2021.08.26/IMG_6885.jpg"
  ],
  "25.09.2020": [
    "/images/trainings/2020.09.25/IMG_0613.jpg",
    "/images/trainings/2020.09.25/IMG_0645.jpg",
    "/images/trainings/2020.09.25/IMG_0647.jpg"
  ],
  "23.09.2020": [
    "/images/trainings/2020.09.23/IMG_0582.jpg"
  ],
  "28.08.2020": [
    "/images/trainings/2020.08.28/IMG_0244.jpg"
  ],
  "12.03.2020": [
    "/images/trainings/2020.03.12/IMG_0053.JPG"
  ],
  "31.01.2020": [
    "/images/trainings/2020.01.31/IMG_5991.JPG",
    "/images/trainings/2020.01.31/IMG_6002.JPG"
  ],
  "18.12.2019": [
    "/images/trainings/2019.12.18/IMG_0037.JPG",
    "/images/trainings/2019.12.18/IMG_0039.JPG",
    "/images/trainings/2019.12.18/IMG_0040.JPG",
    "/images/trainings/2019.12.18/IMG_0042.JPG",
    "/images/trainings/2019.12.18/IMG_0048.JPG"
  ],
  "16.12.2019": [
    "/images/trainings/2019.12.16/IMG_4870.JPG",
    "/images/trainings/2019.12.16/IMG_4871.JPG"
  ],
  "15.11.2019": [
    "/images/trainings/2019.11.15/IMG_1599.JPG",
    "/images/trainings/2019.11.15/IMG_1602.JPG"
  ],
  "31.10.2019": [
    "/images/trainings/2019.10.31/IMG_1504.JPG",
    "/images/trainings/2019.10.31/IMG_1510.JPG",
    "/images/trainings/2019.10.31/IMG_1513.JPG"
  ],
  "17.05.2019": [
    "/images/trainings/2019.05.17/IMG_0983.JPG",
    "/images/trainings/2019.05.17/IMG_0994.JPG"
  ],
  "15.05.2019": [
    "/images/trainings/2019.05.15/Andrey_Rahvalskiy_-19.jpg",
    "/images/trainings/2019.05.15/Andrey_Rahvalskiy_-52.jpg",
    "/images/trainings/2019.05.15/Andrey_Rahvalskiy_-84.jpg"
  ],
  "04.11.2018": [
    "/images/trainings/2018.11.04/2018-11-3-4  1 ШИМ 4 РАН СПб.JPG",
    "/images/trainings/2018.11.04/2018-11-3-4  2 ШИМ 4 РАН СПб.JPG",
    "/images/trainings/2018.11.04/2018-11-3-4 3 ШИМ 4 РАН СПб.JPG"
  ],
  "28.09.2018": [
    "/images/trainings/2018.09.28/IMG_9589.JPG"
  ],
  "31.08.2018": [
    "/images/trainings/2018.08.31/IMG_0131.JPG",
    "/images/trainings/2018.08.31/IMG_0132.JPG"
  ],
  "30.08.2018": [
    "/images/trainings/2018.08.30/IMG_9416.JPG"
  ],
  "10.08.2018": [
    "/images/trainings/2018.08.10/IMG_9263.JPG"
  ],
  "06.08.2018": [
    "/images/trainings/2018.08.06/IMG_9193.JPG"
  ],
  "02.03.2018": [
    "/images/trainings/2018.03.02/2018-03-02 1 Школа радиотерапевта.JPG",
    "/images/trainings/2018.03.02/2018-03-02 2 Школа радиотерапевта.JPG",
    "/images/trainings/2018.03.02/2018-03-02 Школа радиотерапевта.JPG"
  ],
  "08.10.2017": [
    "/images/trainings/2017.10.08/2017-10-7-8 5 ШИМ 3 Москва.JPG",
    "/images/trainings/2017.10.08/2017-10-7-8 6 ШИМ 3 Москва.JPG"
  ],
  "07.10.2017": [
    "/images/trainings/2017.10.07/2017-10-7-8 1 ШИМ 3 Москва.JPG",
    "/images/trainings/2017.10.07/2017-10-7-8 2 ШИМ 3 Москва.JPG",
    "/images/trainings/2017.10.07/2017-10-7-8 3 ШИМ 3 Москва.JPG",
    "/images/trainings/2017.10.07/2017-10-7-8 4 ШИМ 3 Москва.JPG"
  ],
  "28.04.2017": [
    "/images/trainings/2017.04.28/2017-04-28 1 Мечникова.jpg",
    "/images/trainings/2017.04.28/2017-04-28 2  Мечникова.JPG"
  ],
  "26.11.2016": [
    "/images/trainings/2016.11.26/2016-11-26-27 1 ШИМ1 Больница РАН.JPG"
  ],
  "30.09.2016": [
    "/images/trainings/2016.09.30/2016-09-29 1 Владивосток ВАБ конференция.JPG",
    "/images/trainings/2016.09.30/2016-09-29 2 Владивосток ВАБ конференция.JPG"
  ],
  "29.09.2016": [
    "/images/trainings/2016.09.29/2016-09-29 3 Владивосток ВАБ конференция.JPG"
  ],
  "10.04.2016": [
    "/images/trainings/2016.04.10/2016-04-08-10 2 Школа ВАБ Клиника.JPG"
  ],
  "08.04.2016": [
    "/images/trainings/2016.04.08/2016-04-08-10 1 Школа ВАБ Клиника.JPG"
  ],
  "03.04.2016": [
    "/images/trainings/2016.04.03/2016-04-03 Зеленоградск конференция ВАБ.JPG"
  ],
  "02.04.2016": [
    "/images/trainings/2016.04.02/2016-06-14-16 1 Астана конференция ВАБ.JPG",
    "/images/trainings/2016.04.02/2016-06-14-16 2 Астана конференция ВАБ.JPG",
    "/images/trainings/2016.04.02/2016-06-14-16 3 Астана конференция ВАБ.JPG",
    "/images/trainings/2016.04.02/2016-06-14-16 4 Астана конференция ВАБ.JPG"
  ],
  "16.10.2015": [
    "/images/trainings/2015.10.16/2015-10-15-16 5 Астана ЕвразРадФорум.JPG",
    "/images/trainings/2015.10.16/2015-10-15-16 6 Астана ЕвразРадФорум.JPG"
  ],
  "15.10.2015": [
    "/images/trainings/2015.10.15/2015-10-15-16  2 Астана ЕвразРадФорум.JPG",
    "/images/trainings/2015.10.15/2015-10-15-16  4 Астана ЕвразРадФорум.JPG",
    "/images/trainings/2015.10.15/2015-10-15-16 Астана ЕвразРадФорум.JPG"
  ],
  "17.09.2015": [
    "/images/trainings/2015.09.17/2015-09-16  2 IBUS.JPG",
    "/images/trainings/2015.09.17/2015-09-16 1 IBUS.JPG",
    "/images/trainings/2015.09.17/2015-09-16 3 IBUS.JPG"
  ]
};

// Training dates from /public/images/trainings folders
const trainingDates = Object.keys(trainingImagesMap).sort((a, b) => {
  // Sort by date descending (newest first)
  const [dayA, monthA, yearA] = a.split('.').map(Number);
  const [dayB, monthB, yearB] = b.split('.').map(Number);
  const dateA = new Date(yearA, monthA - 1, dayA);
  const dateB = new Date(yearB, monthB - 1, dayB);
  return dateB.getTime() - dateA.getTime();
});

// Generate training news items
const generateTrainingNews = (): NewsItem[] => {
  return trainingDates.map((date) => {
    const [day, month, year] = date.split('.');
    const formattedDate = `${day}.${month}.${year}`;
    const id = `training-${date.replace(/\./g, '-')}`;
    
    // Parse date to get month name in Russian
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const monthIndex = parseInt(month) - 1;
    const monthName = monthNames[monthIndex];
    
    // Get images from the mapping
    const images = trainingImagesMap[date] || [];
    
    return {
      id,
      title: `Очередное обучение в Клинике Одинцова - ${formattedDate}`,
      shortDescription: `Проведено очередное обучение по курсу вакуумно-аспирационной биопсии и малоинвазивных технологий в Клинике Одинцова ${formattedDate}.`,
      fullDescription: `В Клинике Одинцова ${day} ${monthName} ${year} года состоялось очередное обучение по курсу вакуумно-аспирационной биопсии и малоинвазивных технологий.

Под руководством опытных специалистов участники курса получили теоретические знания и практические навыки работы с современным оборудованием для вакуумной аспирационной биопсии молочной железы.

Программа обучения включала:
- Изучение теоретических основ вакуумно-аспирационной биопсии
- Отработку практических навыков на современных тренажерах
- Освоение малоинвазивных технологий в маммологии
- Разбор клинических случаев
- Практическую работу с оборудованием DK-B-MS

Все участники успешно прошли обучение и получили сертификаты о повышении квалификации.`,
      date: formattedDate,
      year,
      category: "Обучение",
      location: "Клиника Одинцова",
      tags: ["обучение", "ВАБ", "Клиника Одинцова", "малоинвазивные технологии"],
      images: images.length > 0 ? images : undefined,
    };
  });
};

export const newsData: NewsItem[] = [
  {
    id: "xishan-contract",
    title: "Заключение контракта с Xishan",
    shortDescription: "Долгое время мы представляли другого производителя, но теперь переходим к сотрудничеству с заводом Сишань.",
    fullDescription: `После долгого времени успешного сотрудничества с предыдущим производителем, мы рады объявить о стратегическом партнерстве с Xishan - ведущим производителем оборудования для вакуумной аспирационной биопсии.

Это важный шаг в развитии нашей компании, который открывает новые возможности для предоставления нашим клиентам самых современных и надежных решений в области медицинской диагностики.

Xishan представляет собой современное производство с высоким уровнем качества и инновационными технологиями. Мы уверены, что это партнерство принесет значительные преимущества как для нашей компании, так и для медицинских учреждений, использующих наше оборудование.`,
    date: "01.2024",
    year: "2024",
    category: "Партнерство",
    images: ["/images/news/xishan-contract-1.jpg", "/images/news/xishan-contract-2.jpg"],
    documents: ["/docs/xishan-contract.pdf"],
    tags: ["контракт", "партнерство", "xishan"]
  },
  {
    id: "golden-plaque",
    title: "Золотая табличка в Клинике",
    shortDescription: "Получение золотой таблички признания в одной из ведущих клиник страны за высокое качество обслуживания и профессионализм.",
    fullDescription: `Наша компания удостоена высокой награды - золотой таблички признания от одной из ведущих клиник страны.

Эта награда стала результатом многолетнего успешного сотрудничества, высокого качества предоставляемых услуг и профессионализма нашей команды. Мы гордимся тем, что наши партнеры высоко оценивают нашу работу и вклад в развитие медицинской диагностики в России.

Награда будет размещена в холле клиники как символ надежного и качественного партнерства.`,
    date: "03.2024",
    year: "2024",
    category: "Новости компании",
    images: ["/images/news/golden-plaque.jpg"],
    location: "Москва",
    tags: ["награда", "клиника", "признание"]
  },
  {
    id: "demo-equipment-arrival",
    title: "Начало регистрации и ввоз первых демо аппаратов",
    shortDescription: "Успешная регистрация оборудования и прибытие первых демонстрационных аппаратов для проведения обучения и демонстраций.",
    fullDescription: `Завершены все необходимые процедуры регистрации оборудования в Росздравнадзоре. Прибыли первые демонстрационные аппараты Xishan для проведения обучающих программ и демонстраций.

Оборудование прошло все необходимые проверки и готово к использованию в клинической практике. Мы планируем организовать серию демонстрационных мероприятий для потенциальных клиентов и партнеров.

Демо-аппараты будут использоваться для:
- Обучения медицинского персонала
- Демонстрации возможностей оборудования
- Клинических испытаний
- Сервисного обслуживания`,
    date: "03.2024",
    year: "2024",
    category: "Новости компании",
    images: ["/images/news/demo-equipment-1.jpg", "/images/news/demo-equipment-2.jpg"],
    videos: ["/videos/demo-setup.mp4"],
    tags: ["оборудование", "регистрация", "демо"]
  },
  {
    id: "first-conference-2024",
    title: "Первая конференция апрель 2024",
    shortDescription: "Проведение первой конференции с участием ведущих специалистов. Видео отзывы участников конференции.",
    fullDescription: `Успешно проведена первая конференция, посвященная современным методам диагностики и лечения заболеваний молочной железы.

В мероприятии приняли участие ведущие специалисты из различных регионов России. Были представлены доклады по новейшим технологиям в области маммологии, продемонстрированы возможности современного оборудования.

Участники конференции отметили высокий уровень организации и актуальность представленных материалов. Особый интерес вызвала демонстрация работы оборудования Xishan в реальных клинических условиях.`,
    date: "15.04.2024",
    year: "2024",
    category: "Мероприятия",
    images: ["/images/news/conference-2024-1.jpg", "/images/news/conference-2024-2.jpg"],
    videos: ["/videos/conference-2024-reviews.mp4"],
    location: "Москва",
    tags: ["конференция", "маммология", "обучение"]
  },
  {
    id: "cmef-shanghai-2024",
    title: "CMEF Шанхай апрель 2024",
    shortDescription: "Участие в выставке CMEF в Шанхае. Проведение мастер-класса для специалистов из Бразилии.",
    fullDescription: `Компания FB.NET приняла участие в крупнейшей выставке медицинского оборудования CMEF в Шанхае.

В рамках выставки был проведен мастер-класс для специалистов из Бразилии, где были продемонстрированы возможности современного оборудования для вакуумной аспирационной биопсии.

Участники мастер-класса высоко оценили качество оборудования и профессионализм наших специалистов. Были установлены контакты для дальнейшего сотрудничества.`,
    date: "20.04.2024",
    year: "2024",
    category: "Мероприятия",
    images: ["/images/news/cmef-shanghai-1.jpg", "/images/news/cmef-shanghai-2.jpg"],
    videos: ["/videos/cmef-masterclass.mp4"],
    location: "Шанхай, Китай",
    tags: ["выставка", "CMEF", "Бразилия", "мастер-класс"]
  },
  {
    id: "factory-audit",
    title: "Аудит производственной площадки",
    shortDescription: "Проведение аудита производственной площадки Xishan. Получение акта о прохождении аудита.",
    fullDescription: `Завершен аудит производственной площадки нашего партнера Xishan. Аудит проводился международными экспертами и подтвердил соответствие производства всем необходимым стандартам качества.

Были проверены:
- Системы контроля качества
- Производственные процессы
- Системы управления качеством
- Соответствие стандартам ISO

По итогам аудита получен положительный акт, подтверждающий высокое качество производимых изделий.`,
    date: "09.2024",
    year: "2024",
    category: "Партнерство",
    images: ["/images/news/audit-1.jpg", "/images/news/audit-2.jpg"],
    documents: ["/docs/audit-report.pdf"],
    location: "Китай",
    tags: ["аудит", "качество", "производство"]
  },
  {
    id: "zdravka-2024",
    title: "Здравка 2024",
    shortDescription: "Участие в международной выставке Здравка 2024. Демонстрация новейших технологий и оборудования.",
    fullDescription: `Компания FB.NET успешно представила свои новейшие разработки на международной выставке Здравка 2024.

Посетители стенда смогли ознакомиться с современным оборудованием для диагностики заболеваний молочной железы, получить консультации специалистов и узнать о возможностях обучения.

Выставка стала отличной площадкой для установления новых контактов и укрепления существующих партнерских отношений.`,
    date: "01.10.2024",
    year: "2024",
    category: "Мероприятия",
    images: ["/images/news/zdravka-2024-1.jpg", "/images/news/zdravka-2024-2.jpg"],
    location: "София, Болгария",
    tags: ["выставка", "Здравка", "Болгария"]
  },
  {
    id: "arab-health-2025",
    title: "Arab Health 2025",
    shortDescription: "Участие в выставке Arab Health. Проведение мастер-класса на стенде для иностранных врачей.",
    fullDescription: `Успешное участие в крупнейшей выставке медицинского оборудования на Ближнем Востоке - Arab Health 2025.

В рамках выставки проведен мастер-класс для иностранных врачей, где были продемонстрированы современные методики диагностики и лечения заболеваний молочной железы.

Мероприятие привлекло большое внимание специалистов из различных стран региона.`,
    date: "01.02.2025",
    year: "2025",
    category: "Мероприятия",
    images: ["/images/news/arab-health-1.jpg", "/images/news/arab-health-2.jpg"],
    videos: ["/videos/arab-health-masterclass.mp4"],
    location: "Дубай, ОАЭ",
    tags: ["выставка", "Arab Health", "ОАЭ", "мастер-класс"]
  },
  {
    id: "second-conference-2025",
    title: "II Конференция апрель 2025",
    shortDescription: "Вторая конференция с участием НИИ Петрова, НИИ Герцена и МКНЦ. Видео отзывы участников.",
    fullDescription: `Проведена вторая ежегодная конференция с участием ведущих научных институтов: НИИ Петрова, НИИ Герцена и МКНЦ.

Конференция была посвящена самым актуальным вопросам современной маммологии. Были представлены доклады по новейшим исследованиям и клиническим случаям.

Участники отметили высокий научный уровень мероприятия и практическую ценность представленных материалов.`,
    date: "15.04.2025",
    year: "2025",
    category: "Мероприятия",
    images: ["/images/news/conference-2025-1.jpg", "/images/news/conference-2025-2.jpg"],
    videos: ["/videos/conference-2025-reviews.mp4"],
    location: "Санкт-Петербург",
    tags: ["конференция", "НИИ", "наука"]
  },
  {
    id: "petrov-institute-course",
    title: "Курс мультимодальной визуализации МЖ НИИ Петрова",
    shortDescription: "Проведение специализированного курса по мультимодальной визуализации молочной железы совместно с НИИ Петрова.",
    fullDescription: `Совместно с НИИ Петрова проведен специализированный курс по мультимодальной визуализации молочной железы.

Курс охватывал современные методы диагностики, включая УЗИ, маммографию и МРТ. Участники получили практические навыки работы с различными видами оборудования и интерпретации результатов.

Курс был ориентирован на практикующих врачей-радиологов и онкологов.`,
    date: "09.2025",
    year: "2025",
    category: "Обучение",
    images: ["/images/news/petrov-course-1.jpg", "/images/news/petrov-course-2.jpg"],
    documents: ["/docs/course-program.pdf"],
    location: "Санкт-Петербург",
    tags: ["курс", "визуализация", "НИИ Петрова"]
  },
  {
    id: "iraq-specialists-course",
    title: "Курс для специалистов из Ирака",
    shortDescription: "Специализированный курс для иракских специалистов совместно с Клиникой Одинцова, НИИ Петрова и МКНЦ.",
    fullDescription: `Проведен специализированный курс для медицинских специалистов из Ирака. Мероприятие организовано совместно с Клиникой Одинцова, НИИ Петрова и МКНЦ.

Курс включал теоретическую подготовку и практические занятия по современным методам диагностики и лечения заболеваний молочной железы.

Участники отметили высокий уровень организации и актуальность представленных материалов.`,
    date: "10.2025",
    year: "2025",
    category: "Обучение",
    images: ["/images/news/iraq-course-1.jpg", "/images/news/iraq-course-2.jpg"],
    videos: ["/videos/iraq-course.mp4"],
    location: "Москва",
    tags: ["международный курс", "Ирак", "обучение"]
  },
  {
    id: "dusseldorf-exhibition",
    title: "Выставка в Дюссельдорфе",
    shortDescription: "Участие в международной выставке медицинского оборудования в Дюссельдорфе.",
    fullDescription: `Компания FB.NET представила свои новейшие разработки на международной выставке медицинского оборудования в Дюссельдорфе.

Выставка собрала ведущих производителей и специалистов из разных стран. Мы продемонстрировали инновационные решения в области диагностики заболеваний молочной железы.

Мероприятие стало отличной возможностью для обмена опытом и установления новых партнерских отношений.`,
    date: "11.2025",
    year: "2025",
    category: "Мероприятия",
    images: ["/images/news/dusseldorf-1.jpg", "/images/news/dusseldorf-2.jpg"],
    location: "Дюссельдорф, Германия",
    tags: ["выставка", "Германия", "международное"]
  },
  {
    id: "zdravka-2025",
    title: "Здравка 2025",
    shortDescription: "Участие в ежегодной выставке Здравка 2025. Презентация новейших достижений в области медицинского оборудования.",
    fullDescription: `Традиционное участие в выставке Здравка 2025, где мы представили самые современные достижения в области медицинского оборудования для диагностики заболеваний молочной железы.

Посетители нашего стенда смогли ознакомиться с новейшими разработками, получить консультации специалистов и узнать о предстоящих обучающих программах.

Выставка подтвердила нашу лидирующую позицию на рынке медицинского оборудования Восточной Европы.`,
    date: "12.2025",
    year: "2025",
    category: "Мероприятия",
    images: ["/images/news/zdravka-2025-1.jpg", "/images/news/zdravka-2025-2.jpg"],
    videos: ["/videos/zdravka-2025.mp4"],
    location: "София, Болгария",
    tags: ["выставка", "Здравка", "Болгария"]
  },
  // Add training news items
  ...generateTrainingNews()
];

export const getNewsByYear = (year: string) => {
  return newsData.filter(news => news.year === year);
};

export const getNewsById = (id: string) => {
  return newsData.find(news => news.id === id);
};

export const getAllYears = () => {
  return [...new Set(newsData.map(news => news.year))].sort((a, b) => b.localeCompare(a));
};

export const getNewsByCategory = (category: string) => {
  return newsData.filter(news => news.category === category);
};

export const getAllCategories = () => {
  const categories = newsData
    .map(news => news.category)
    .filter((category): category is string => category !== undefined);
  return [...new Set(categories)].sort();
};

export const getCategoryCount = (category: string) => {
  return newsData.filter(news => news.category === category).length;
};

// Normalize tag to match filter format (capitalize first letter)
export const normalizeTag = (tag: string): string => {
  return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
};

// Get all unique categories for filtering (EXCLUDING TAGS to keep list clean)
export const getAllTagsAndCategories = () => {
  const allItems = new Set<string>();
  
  // Add all categories
  newsData.forEach(news => {
    if (news.category) {
      allItems.add(news.category);
    }
  });
  
  // We no longer mix tags into the main filter list as per user request
  // to reduce the number of categories.
  
  return Array.from(allItems).sort((a, b) => a.localeCompare(b, 'ru'));
};

// Get count for a category (ignoring tags for filter count now)
export const getTagOrCategoryCount = (item: string) => {
  // Check if it matches a category
  const categoryCount = newsData.filter(news => news.category === item).length;
  
  if (categoryCount > 0) return categoryCount;

  // Fallback for backward compatibility if item is passed that is actually a tag
  const tagCount = newsData.filter(news => 
    news.tags?.some(tag => 
      tag.toLowerCase() === item.toLowerCase() || 
      tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase() === item
    )
  ).length;
  
  return tagCount;
};

// Check if news matches a category filter
export const newsMatchesFilter = (news: NewsItem, filter: string): boolean => {
  // Check category
  if (news.category === filter) {
    return true;
  }
  
  // Backward compatibility: Check tags if filter matches a tag
  if (news.tags?.some(tag => 
    tag.toLowerCase() === filter.toLowerCase() || 
    tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase() === filter
  )) {
    return true;
  }
  
  return false;
};
