SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Reports](
	[id] [uniqueidentifier] NOT NULL,
	[tenantId] [uniqueidentifier] NOT NULL,
	[tenantName] [varchar](120) NOT NULL,
	[subscriptionId] [uniqueidentifier] NOT NULL,
	[subscriptionName] [varchar](120) NOT NULL,
	[resourceGroupId] [varchar](1200) NULL,
	[resourceGroupName] [varchar](120) NULL,
	[title] [varchar](120) NOT NULL,
	[userCount] [int] NOT NULL,
	[created] [int] NOT NULL,
	[status] [int] NOT NULL,
	[dataSource] [varchar](120) NOT NULL,
	[fromDate] [datetime] NOT NULL
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Reports] ADD PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[Reports] ADD  DEFAULT (newid()) FOR [id]
GO
ALTER TABLE [dbo].[Reports] ADD  DEFAULT (datediff(second,'1970-01-01',getutcdate())) FOR [created]
GO
ALTER TABLE [dbo].[Reports] ADD  DEFAULT ((1)) FOR [status]
GO
ALTER TABLE [dbo].[Reports] ADD  DEFAULT ('Graph API') FOR [dataSource]
GO
ALTER TABLE [dbo].[Reports] ADD  DEFAULT (getdate()) FOR [fromDate]
GO
ALTER TABLE [dbo].[Reports]  WITH CHECK ADD FOREIGN KEY([status])
REFERENCES [dbo].[ReportStatus] ([id])
GO
