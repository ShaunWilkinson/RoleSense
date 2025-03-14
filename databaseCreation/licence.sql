SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Licence](
	[tenantId] [uniqueidentifier] NOT NULL,
	[logAnalyticsWorkspaceId] [varchar](3000) NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Licence] ADD PRIMARY KEY CLUSTERED 
(
	[tenantId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
