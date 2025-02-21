import arcpy
import datetime
import os

if __name__ == '__main__':
    dt = datetime.datetime.now()
    time = dt.strftime('%Y_%m_%d_%H_%M_%S')
    
    # Paths to the datasets and relations in the validation.gdb
    dataset_table = r'...\validation.gdb\dataset'
    dataset_geometry_table = r'...\validation.gdb\dataset_geometry'
    dataset_geometry_attribute_table = r'...\validation.gdb\dataset_geometry_attribute'
    attribute_table = r'...\validation.gdb\attribute'
    empty_fc = r'...\validation.gdb\empty'
    fieldmap = {
        'integer': 'LONG',
        'float': 'FLOAT',
        'text': 'TEXT'
    }

    arcpy.AddMessage('--- Start processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))

    database_path = arcpy.GetParameterAsText(0)
    category_nr = arcpy.GetParameter(1)
    spatial_ref = arcpy.Describe(empty_fc).spatialReference
    
    dataset_geometry_join_table = arcpy.management.AddJoin(dataset_geometry_table, 'dataset_id', dataset_table, 'id')
    dataset_geometry_attribute_join_table = arcpy.management.AddJoin(dataset_geometry_attribute_table, 'attribute_id', attribute_table, 'id')
    
    fields = arcpy.ListFields(dataset_geometry_join_table)
    for field in fields:
        arcpy.AddMessage(field.name)
    
    dataset_geometry_fields = ['dataset.code', 'dataset_geometry.id', 'dataset_geometry.geometry']
    dataset_geometry_where = 'dataset.category_id = ' + str(category_nr)
    arcpy.AddMessage(dataset_geometry_where)
    with arcpy.da.SearchCursor(dataset_geometry_join_table, dataset_geometry_fields, dataset_geometry_where) as cursor1:
        for row1 in cursor1:
            if row1[2] == 'point' or row1[2] == 'polyline' or row1[2] == 'polygon':
                fc_name = row1[0] + '_' + row1[2]
                fc_path = os.path.join(database_path, fc_name)
                if not arcpy.Exists(fc_path):
                    arcpy.management.CreateFeatureclass(database_path, fc_name, row1[2].upper(), '', 'DISABLED', 'DISABLED', spatial_ref)
                    dataset_geometry_attribute_fields = ['attribute.name', 'attribute.type']
                    dataset_geometry_attribute_where = 'dataset_geometry_id = ' + str(row1[1])
                    with arcpy.da.SearchCursor(dataset_geometry_attribute_join_table, dataset_geometry_attribute_fields, dataset_geometry_attribute_where) as cursor2:
                        for row2 in cursor2:
                            arcpy.management.AddField(fc_path, row2[0], fieldmap[row2[1]])
                    arcpy.management.AddField(fc_path, 'upload_user', 'TEXT')
                    arcpy.management.AddField(fc_path, 'upload_date', 'DATE')
                    arcpy.AddMessage(fc_name + ' created')
                else:
                    arcpy.AddMessage(fc_name + ' already exists')
            elif row1[2] == 'raster':
                pass

    dt = datetime.datetime.now()
    arcpy.AddMessage('--- End processing at ' + dt.strftime('%Y %m %d %H:%M:%S'))